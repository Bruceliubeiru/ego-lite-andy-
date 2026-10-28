import test from "node:test";
import assert from "node:assert/strict";

import {
  browserCdp,
  drainBrowserEvents,
  invalidateSession,
  isBrowserRuntime,
  pendingDialog,
  setPreferredTarget,
  clearPreferredTarget,
  ensureSession,
  browserSnapshotRefsToRefMap,
  waitForBrowserEvent,
} from "../dist/src/browser-runtime.js";
import { state } from "../dist/src/state.js";

/**
 * Install a mock ego that auto-responds to every CDP send with { result: {} }.
 * Use the returned `calls` array to inspect what was sent, and `ego.onCDPMessage`
 * (set by rawCdp after the first send) to deliver events directly.
 */
function installAutoEgo(listTabsResult) {
  const calls = [];
  const tabs = listTabsResult || {
    tabs: [{ targetId: "tab-1", active: true }],
  };
  globalThis.ego = {
    async listTabs() {
      return tabs;
    },
    sendCDPMessage(payload) {
      const parsed = JSON.parse(payload);
      calls.push(parsed);
      setTimeout(() => {
        if (globalThis.ego?.onCDPMessage) {
          const result =
            parsed.method === "Target.attachToTarget"
              ? { sessionId: `auto-sess-${parsed.id}` }
              : {};
          globalThis.ego.onCDPMessage(
            JSON.stringify({ id: parsed.id, result }),
          );
        }
      }, 0);
    },
  };
  return calls;
}

/**
 * Install a mock ego with manual control over sendCDPMessage.
 * Returns the calls array; use ego.onCDPMessage after a send to deliver responses.
 */
function installManualEgo(listTabsResult) {
  const calls = [];
  const tabs = listTabsResult || {
    tabs: [{ targetId: "tab-1", active: true }],
  };
  globalThis.ego = {
    async listTabs() {
      return tabs;
    },
    sendCDPMessage(payload) {
      calls.push(JSON.parse(payload));
    },
  };
  return calls;
}

/** Simulate a lost implicit CDP session; optionally change the active target. */
function installLostSessionEgo(failingMethod, nextTarget = "tab-1") {
  const calls = [];
  let target = "tab-1";
  let attachments = 0;
  let failures = 0;
  globalThis.ego = {
    async listTabs() {
      return { tabs: [{ targetId: target, active: true }] };
    },
    sendCDPMessage(payload) {
      const parsed = JSON.parse(payload);
      calls.push(parsed);
      setTimeout(() => {
        if (parsed.method === "Target.attachToTarget") {
          attachments += 1;
          globalThis.ego.onCDPMessage(
            JSON.stringify({
              id: parsed.id,
              result: { sessionId: `sess-${attachments}` },
            }),
          );
        } else if (parsed.method === failingMethod && failures++ === 0) {
          target = nextTarget;
          globalThis.ego.onCDPMessage(
            JSON.stringify({
              id: parsed.id,
              error: { message: "Session not found" },
            }),
          );
        } else {
          globalThis.ego.onCDPMessage(
            JSON.stringify({ id: parsed.id, result: {} }),
          );
        }
      }, 0);
    },
  };
  return calls;
}

/** Fire a CDP event through the handler set up by rawCdp. */
function fireEvent(method, params = {}, sessionId) {
  const msg = { method, params };
  if (sessionId) msg.sessionId = sessionId;
  globalThis.ego.onCDPMessage(JSON.stringify(msg));
}

function cleanup() {
  delete globalThis.ego;
  invalidateSession();
  clearPreferredTarget();
  drainBrowserEvents();
  state.cdpOverride = null;
  state.sessionInflight = null;
}

/* ------------------------------------------------------------------ */
/*  isBrowserRuntime                                                  */
/* ------------------------------------------------------------------ */

test("isBrowserRuntime returns false when ego is not installed", () => {
  delete globalThis.ego;
  assert.equal(isBrowserRuntime(), false);
});

test("isBrowserRuntime returns true when ego has sendCDPMessage", () => {
  installAutoEgo();
  try {
    assert.equal(isBrowserRuntime(), true);
  } finally {
    cleanup();
  }
});

test("isBrowserRuntime returns false when ego lacks sendCDPMessage", () => {
  globalThis.ego = { listTabs() {} };
  try {
    assert.equal(isBrowserRuntime(), false);
  } finally {
    delete globalThis.ego;
  }
});

/* ------------------------------------------------------------------ */
/*  rawCdp — request/response                                         */
/* ------------------------------------------------------------------ */

test("browserCdp with explicit sessionId sends and resolves on matching response", async () => {
  const calls = installManualEgo();
  try {
    const promise = browserCdp(
      "Runtime.evaluate",
      { expression: "1" },
      "sess-1",
      5000,
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "Runtime.evaluate");
    assert.equal(calls[0].sessionId, "sess-1");
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: { value: 42 } }),
    );
    const result = await promise;
    assert.deepEqual(result.result, { value: 42 });
  } finally {
    cleanup();
  }
});

test("browserCdp rejects when CDP response carries an error", async () => {
  const calls = installManualEgo();
  try {
    const promise = browserCdp("Runtime.evaluate", {}, "sess-1", 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, error: { message: "SyntaxError" } }),
    );
    await assert.rejects(promise, /SyntaxError/);
  } finally {
    cleanup();
  }
});

test("browserCdp times out when no response arrives", async () => {
  installManualEgo();
  try {
    await assert.rejects(
      () => browserCdp("Runtime.evaluate", {}, "sess-1", 100),
      /CDP request timed out: Runtime\.evaluate/,
    );
  } finally {
    cleanup();
  }
});

test("browserCdp rejects when sendCDPMessage throws synchronously", async () => {
  globalThis.ego = {
    sendCDPMessage() {
      throw new Error("binding gone");
    },
  };
  try {
    await assert.rejects(
      () => browserCdp("Target.getVersion", {}, undefined, 1000),
      /binding gone/,
    );
  } finally {
    cleanup();
  }
});

test("handleMessage ignores unparseable JSON", async () => {
  const calls = installManualEgo();
  try {
    // Trigger rawCdp to set up onCDPMessage
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage("not valid json{{{");
    const evts = drainBrowserEvents();
    assert.equal(evts.length, 0, "bad JSON is silently ignored");
    // Clean up: respond to the pending request
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;
  } finally {
    cleanup();
  }
});

test("handleMessage ignores responses for unknown request ids", async () => {
  const calls = installManualEgo();
  try {
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(JSON.stringify({ id: 999999, result: {} }));
    const evts = drainBrowserEvents();
    assert.equal(evts.length, 0, "unknown id produces no events");
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  drainBrowserEvents — event buffer                                 */
/* ------------------------------------------------------------------ */

test("drainBrowserEvents collects CDP events and clears the buffer", async () => {
  const calls = installManualEgo();
  try {
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Network.requestWillBeSent", { requestId: "1" });
    fireEvent("Page.loadEventFired", { timestamp: 123 });

    const first = drainBrowserEvents();
    assert.equal(first.length, 2);
    assert.equal(first[0].method, "Network.requestWillBeSent");
    assert.equal(first[1].method, "Page.loadEventFired");

    const second = drainBrowserEvents();
    assert.equal(second.length, 0, "second drain returns empty");
  } finally {
    cleanup();
  }
});

test("subscribeBrowserEvent delivers events from the requested session", async () => {
  const runtime = await import("../dist/src/browser-runtime.js");
  assert.equal(typeof runtime.subscribeBrowserEvent, "function");

  installAutoEgo();
  let unsubscribe;
  try {
    await browserCdp("Runtime.evaluate", { expression: "1" });
    const received = [];
    unsubscribe = runtime.subscribeBrowserEvent(
      "Page.screencastFrame",
      "sess-video",
      (event) => received.push(event.params.data),
    );

    fireEvent("Page.screencastFrame", { data: "wrong" }, "sess-other");
    fireEvent("Page.screencastFrame", { data: "frame-1" }, "sess-video");

    assert.deepEqual(received, ["frame-1"]);
  } finally {
    unsubscribe?.();
    cleanup();
  }
});

test("subscribeBrowserEvent stops delivery after unsubscribe", async () => {
  const { subscribeBrowserEvent } =
    await import("../dist/src/browser-runtime.js");
  installAutoEgo();
  try {
    await browserCdp("Runtime.evaluate", { expression: "1" });
    const received = [];
    const unsubscribe = subscribeBrowserEvent(
      "Page.screencastFrame",
      "sess-video",
      (event) => received.push(event.params.data),
    );
    unsubscribe();

    fireEvent("Page.screencastFrame", { data: "late-frame" }, "sess-video");

    assert.deepEqual(received, []);
  } finally {
    cleanup();
  }
});

test("subscribed screencast frames bypass the generic event buffer", async () => {
  const { subscribeBrowserEvent } =
    await import("../dist/src/browser-runtime.js");
  installAutoEgo();
  let unsubscribe;
  try {
    await browserCdp("Runtime.evaluate", { expression: "1" });
    unsubscribe = subscribeBrowserEvent(
      "Page.screencastFrame",
      "sess-video",
      () => {},
    );

    fireEvent(
      "Page.screencastFrame",
      { data: "large-base64-frame" },
      "sess-video",
    );

    assert.deepEqual(drainBrowserEvents(), []);
  } finally {
    unsubscribe?.();
    cleanup();
  }
});

test("waitForBrowserEvent resolves future matching events", async () => {
  installAutoEgo();
  try {
    await browserCdp("Runtime.evaluate", { expression: "1" });
    const promise = waitForBrowserEvent(
      (event) => event.method === "Page.downloadWillBegin",
      500,
    );
    fireEvent("Page.downloadWillBegin", {
      guid: "download-1",
      suggestedFilename: "file.png",
    });
    const event = await promise;
    assert.equal(event.params.guid, "download-1");
  } finally {
    cleanup();
  }
});

test("waitForBrowserEvent ignores events that happened before waiting", async () => {
  installAutoEgo();
  try {
    await browserCdp("Runtime.evaluate", { expression: "1" });
    fireEvent("Page.downloadWillBegin", {
      guid: "old-download",
      suggestedFilename: "old.png",
    });
    const promise = waitForBrowserEvent(
      (event) => event.method === "Page.downloadWillBegin",
      500,
    );
    fireEvent("Page.downloadWillBegin", {
      guid: "new-download",
      suggestedFilename: "new.png",
    });
    const event = await promise;
    assert.equal(event.params.guid, "new-download");
  } finally {
    cleanup();
  }
});

test("drainBrowserEvents caps at MAX_BUFFERED_EVENTS (10000)", async () => {
  const calls = installManualEgo();
  try {
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    for (let i = 0; i < 10005; i++) {
      fireEvent(`evt.${i}`, {});
    }
    const evts = drainBrowserEvents();
    assert.equal(evts.length, 10000, "buffer capped at 10000 events");
    assert.equal(evts[0].method, "evt.5", "oldest events dropped");
    assert.equal(evts[evts.length - 1].method, "evt.10004");
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  Dialog tracking                                                   */
/* ------------------------------------------------------------------ */

test("pendingDialog tracks dialog open and close", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-d";
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    assert.equal(pendingDialog(), null, "no dialog initially");

    fireEvent(
      "Page.javascriptDialogOpening",
      { type: "alert", message: "Hello" },
      "sess-d",
    );
    const dialog = pendingDialog();
    assert.ok(dialog, "dialog is pending after opening event");
    assert.equal(dialog.type, "alert");
    assert.equal(dialog.message, "Hello");

    fireEvent("Page.javascriptDialogClosed", {}, "sess-d");
    assert.equal(pendingDialog(), null, "dialog cleared after close event");
  } finally {
    cleanup();
  }
});

test("pendingDialog uses state.sessionId when event has no sessionId", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-fallback";
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Page.javascriptDialogOpening", {
      type: "confirm",
      message: "Sure?",
    });
    const dialog = pendingDialog("sess-fallback");
    assert.ok(dialog, "dialog tracked via state.sessionId fallback");
    assert.equal(dialog.type, "confirm");
  } finally {
    cleanup();
  }
});

test("pendingDialog returns null for a different session", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-a";
    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Page.javascriptDialogOpening", { type: "alert" }, "sess-b");
    assert.equal(pendingDialog("sess-a"), null, "no dialog on sess-a");
    assert.ok(pendingDialog("sess-b"), "dialog exists on sess-b");
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  Target detach — invalidates session and cleans up dialog state    */
/* ------------------------------------------------------------------ */

test("Target.detachedFromTarget invalidates session when targetId matches", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-detach";
    state.sessionTargetId = "target-1";
    state.sessionAt = Date.now();

    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Page.javascriptDialogOpening", { type: "alert" }, "sess-detach");
    assert.ok(pendingDialog("sess-detach"), "dialog present before detach");

    fireEvent("Target.detachedFromTarget", {
      targetId: "target-1",
      sessionId: "sess-detach",
    });

    assert.equal(state.sessionId, null, "session invalidated after detach");
    assert.equal(state.sessionTargetId, null);
    assert.equal(
      pendingDialog("sess-detach"),
      null,
      "dialog cleaned up on detach",
    );
  } finally {
    cleanup();
  }
});

test("late detach from an old session on the same target preserves the new session", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-new";
    state.sessionTargetId = "target-1";
    state.sessionAt = Date.now();

    const setup = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await setup;

    fireEvent("Page.javascriptDialogOpening", { type: "alert" }, "sess-new");
    fireEvent("Target.detachedFromTarget", {
      targetId: "target-1",
      sessionId: "sess-old",
    });
    assert.equal(state.sessionId, "sess-new");
    assert.equal(state.sessionTargetId, "target-1");
    assert.ok(pendingDialog("sess-new"), "new session dialog must survive");

    const read = browserCdp("Runtime.evaluate", { expression: "1" });
    await Promise.resolve();
    assert.equal(calls[1].sessionId, "sess-new");
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[1].id, result: { value: 1 } }),
    );
    assert.equal((await read).result.value, 1);
  } finally {
    cleanup();
  }
});

test("detach without a session ID fails closed for the selected target", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-current";
    state.sessionTargetId = "target-1";
    state.sessionAt = Date.now();
    const setup = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await setup;
    fireEvent("Target.detachedFromTarget", { targetId: "target-1" });
    assert.equal(state.sessionId, null);
    assert.equal(state.sessionTargetId, null);
  } finally {
    cleanup();
  }
});

test("Target.targetDestroyed also invalidates session", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-destroy";
    state.sessionTargetId = "target-x";
    state.sessionAt = Date.now();

    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Target.targetDestroyed", { targetId: "target-x" });
    assert.equal(
      state.sessionId,
      null,
      "session invalidated on target destroyed",
    );
  } finally {
    cleanup();
  }
});

test("Target.detachedFromTarget does not invalidate session for a different target", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-keep";
    state.sessionTargetId = "target-ours";
    state.sessionAt = Date.now();

    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Target.detachedFromTarget", {
      targetId: "target-other",
      sessionId: "sess-other",
    });
    assert.equal(
      state.sessionId,
      "sess-keep",
      "session not invalidated for different target",
    );
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  invalidateSession                                                 */
/* ------------------------------------------------------------------ */

test("invalidateSession clears session state and dialog tracking", async () => {
  const calls = installManualEgo();
  try {
    state.sessionId = "sess-inv";
    state.sessionTargetId = "target-1";
    state.sessionAt = Date.now();

    const p = browserCdp("Target.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, result: {} }),
    );
    await p;

    fireEvent("Page.javascriptDialogOpening", { type: "alert" }, "sess-inv");
    invalidateSession();
    assert.equal(state.sessionId, null);
    assert.equal(state.sessionTargetId, null);
    assert.equal(state.sessionAt, 0);
    assert.equal(
      pendingDialog("sess-inv"),
      null,
      "dialog cleared by invalidation",
    );
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  setPreferredTarget / clearPreferredTarget                         */
/* ------------------------------------------------------------------ */

test("setPreferredTarget and clearPreferredTarget manage state", () => {
  setPreferredTarget("target-42");
  assert.equal(state.preferredTargetId, "target-42");
  clearPreferredTarget();
  assert.equal(state.preferredTargetId, null);
});

test("setPreferredTarget treats empty string as null", () => {
  setPreferredTarget("");
  assert.equal(state.preferredTargetId, null);
  setPreferredTarget(undefined);
  assert.equal(state.preferredTargetId, null);
});

test("changing preferred target invalidates a fresh cached session", async () => {
  const calls = installAutoEgo({
    tabs: [
      { targetId: "tab-A", active: true },
      { targetId: "tab-B", active: false },
    ],
  });
  try {
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-A");
    setPreferredTarget("tab-B");
    assert.equal(state.sessionId, null, "old target session must be discarded");
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-B");
    assert.deepEqual(
      calls
        .filter((call) => call.method === "Target.attachToTarget")
        .map((call) => call.params.targetId),
      ["tab-A", "tab-B"],
    );
  } finally {
    cleanup();
  }
});

test("browserCdp rejects a successful old-target read after a concurrent target switch", async () => {
  installAutoEgo({
    tabs: [
      { targetId: "tab-A", active: true },
      { targetId: "tab-B", active: false },
    ],
  });
  const originalSend = globalThis.ego.sendCDPMessage.bind(globalThis.ego);
  let readId;
  let notifyRead;
  const readStarted = new Promise((resolve) => {
    notifyRead = resolve;
  });
  globalThis.ego.sendCDPMessage = (payload) => {
    const request = JSON.parse(payload);
    if (request.method === "DOM.getDocument") {
      readId = request.id;
      notifyRead();
      return;
    }
    originalSend(payload);
  };
  try {
    const read = browserCdp("DOM.getDocument", { depth: 1 });
    await readStarted;
    setPreferredTarget("tab-B");
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: readId, result: { root: { nodeName: "OLD" } } }),
    );
    await assert.rejects(
      read,
      /browser target preference changed during CDP request: DOM.getDocument/,
      "an old-tab response cannot become evidence for the newly selected tab",
    );
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-B");
  } finally {
    cleanup();
  }
});

test("late old-target session failure preserves the new target session", async () => {
  installAutoEgo({
    tabs: [
      { targetId: "tab-A", active: true },
      { targetId: "tab-B", active: false },
    ],
  });
  const originalSend = globalThis.ego.sendCDPMessage.bind(globalThis.ego);
  let readId;
  let notifyRead;
  const readStarted = new Promise((resolve) => {
    notifyRead = resolve;
  });
  globalThis.ego.sendCDPMessage = (payload) => {
    const request = JSON.parse(payload);
    if (request.method === "DOM.getDocument") {
      readId = request.id;
      notifyRead();
      return;
    }
    originalSend(payload);
  };
  try {
    const read = browserCdp("DOM.getDocument", { depth: 1 });
    await readStarted;
    setPreferredTarget("tab-B");
    const newSession = await ensureSession();
    assert.equal(state.sessionTargetId, "tab-B");
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: readId, error: { message: "Session not found" } }),
    );
    await assert.rejects(
      read,
      /browser target preference changed during CDP request: DOM.getDocument/,
    );
    assert.equal(
      state.sessionId,
      newSession,
      "late failure must not clear the new session",
    );
    assert.equal(state.sessionTargetId, "tab-B");
  } finally {
    cleanup();
  }
});

for (const outcome of ["success", "session lost"]) {
  test(`browserCdp rejects old active-tab ${outcome}`, async () => {
    installAutoEgo({
      tabs: [{ targetId: "tab-A", active: true }],
    });
    const originalSend = globalThis.ego.sendCDPMessage.bind(globalThis.ego);
    let readId;
    let notifyRead;
    let delayed = false;
    const readStarted = new Promise((resolve) => {
      notifyRead = resolve;
    });
    globalThis.ego.sendCDPMessage = (payload) => {
      const request = JSON.parse(payload);
      if (request.method === "DOM.getDocument" && !delayed) {
        delayed = true;
        readId = request.id;
        notifyRead();
        return;
      }
      originalSend(payload);
    };
    try {
      const read = browserCdp("DOM.getDocument", { depth: 1 });
      await readStarted;
      // The active tab changes without setPreferredTarget(), so the explicit
      // preference revision remains unchanged.
      globalThis.ego.listTabs = async () => ({
        tabs: [
          { targetId: "tab-A", active: false },
          { targetId: "tab-B", active: true },
        ],
      });
      state.sessionAt = Date.now() - 3000;
      const newSession = await ensureSession();
      assert.equal(state.sessionTargetId, "tab-B");

      globalThis.ego.onCDPMessage(
        JSON.stringify(
          outcome === "success"
            ? { id: readId, result: { root: { nodeName: "OLD" } } }
            : { id: readId, error: { message: "Session not found" } },
        ),
      );
      await assert.rejects(
        read,
        /browser CDP session changed during request: DOM.getDocument/,
        "an abandoned tab's result or error must not affect the new tab",
      );
      assert.equal(state.sessionId, newSession);
      assert.equal(state.sessionTargetId, "tab-B");
    } finally {
      cleanup();
    }
  });
}

test("clearing preferred target reselects the active tab without stale cache", async () => {
  installAutoEgo({
    tabs: [
      { targetId: "tab-A", active: true },
      { targetId: "tab-B", active: false },
    ],
  });
  try {
    setPreferredTarget("tab-B");
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-B");
    clearPreferredTarget();
    assert.equal(state.sessionId, null);
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-A");
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  ensureSession — session caching, TTL, tab selection               */
/* ------------------------------------------------------------------ */

test("ensureSession returns cached session within TTL", async () => {
  installAutoEgo();
  try {
    state.sessionId = "cached-session";
    state.sessionAt = Date.now();
    const result = await ensureSession();
    assert.equal(result, "cached-session");
  } finally {
    cleanup();
  }
});

test("ensureSession re-attaches when TTL has expired", async () => {
  installAutoEgo();
  try {
    state.sessionId = "old-session";
    state.sessionAt = Date.now() - 3000; // expired (> 2000ms TTL)
    const result = await ensureSession();
    assert.equal(typeof result, "string", "returns a session id string");
    assert.ok(result.length > 0, "session id is non-empty");
  } finally {
    cleanup();
  }
});

test("ensureSession deduplicates concurrent calls via sessionInflight", async () => {
  installAutoEgo();
  try {
    const p1 = ensureSession();
    const p2 = ensureSession();
    const [r1, r2] = await Promise.all([p1, p2]);
    assert.equal(r1, r2, "both callers get the same session id");
  } finally {
    cleanup();
  }
});

test("ensureSession selects the preferred tab when available", async () => {
  const calls = installAutoEgo({
    tabs: [
      { targetId: "tab-bg", active: false },
      { targetId: "tab-preferred", active: false },
      { targetId: "tab-active", active: true },
    ],
  });
  try {
    setPreferredTarget("tab-preferred");
    await ensureSession();
    const attach = calls.find((c) => c.method === "Target.attachToTarget");
    assert.ok(attach, "Target.attachToTarget was called");
    assert.equal(
      attach.params.targetId,
      "tab-preferred",
      "attaches to preferred tab",
    );
    const pageEnable = calls.find((c) => c.method === "Page.enable");
    assert.ok(pageEnable, "Page.enable was called for the attached session");
    assert.equal(pageEnable.sessionId, `auto-sess-${attach.id}`);
  } finally {
    cleanup();
  }
});

test("missing preferred target fails closed and can recover without switching tabs", async () => {
  const calls = installAutoEgo({
    tabs: [{ targetId: "tab-other", active: true }],
  });
  try {
    setPreferredTarget("tab-requested");
    await assert.rejects(
      () => ensureSession(),
      /preferred browser target is unavailable/,
    );
    assert.equal(
      calls.filter((call) => call.method === "Target.attachToTarget").length,
      0,
      "must not attach to an unrelated active tab",
    );
    assert.equal(state.sessionId, null);
    assert.equal(state.preferredTargetId, "tab-requested");

    // A temporarily delayed tab listing can recover on the next explicit read.
    globalThis.ego.listTabs = async () => ({
      tabs: [
        { targetId: "tab-other", active: true },
        { targetId: "tab-requested", active: false },
      ],
    });
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-requested");
    const attachments = calls.filter(
      (call) => call.method === "Target.attachToTarget",
    );
    assert.deepEqual(
      attachments.map((call) => call.params.targetId),
      ["tab-requested"],
    );
  } finally {
    cleanup();
  }
});

test("ensureSession falls back to the last tab when no active tab is found", async () => {
  const calls = installAutoEgo({
    tabs: [
      { targetId: "tab-1", active: false },
      { targetId: "tab-last", active: false },
    ],
  });
  try {
    await ensureSession();
    const attach = calls.find((c) => c.method === "Target.attachToTarget");
    assert.ok(attach, "Target.attachToTarget was called");
    assert.equal(attach.params.targetId, "tab-last", "falls back to last tab");
  } finally {
    cleanup();
  }
});

test("ensureSession throws when no tabs are available", async () => {
  installAutoEgo({ tabs: [] });
  try {
    await assert.rejects(() => ensureSession(), /no active tab/);
  } finally {
    cleanup();
  }
});

test("ensureSession skips re-attach when targetId matches existing session", async () => {
  const calls = installAutoEgo();
  try {
    state.sessionId = "existing";
    state.sessionTargetId = "tab-1"; // matches the default tab
    state.sessionAt = Date.now() - 3000; // force re-entry past TTL

    await ensureSession();
    const attach = calls.find((c) => c.method === "Target.attachToTarget");
    assert.equal(attach, undefined, "skips re-attach when target unchanged");
  } finally {
    cleanup();
  }
});

test("target preference change during attach fails closed and permits fresh selection", async () => {
  installAutoEgo({
    tabs: [
      { targetId: "tab-A", active: true },
      { targetId: "tab-B", active: false },
    ],
  });
  const originalSend = globalThis.ego.sendCDPMessage.bind(globalThis.ego);
  let releaseAttach;
  const attachGate = new Promise((resolve) => {
    releaseAttach = resolve;
  });
  let notifyAttach;
  const attachStarted = new Promise((resolve) => {
    notifyAttach = resolve;
  });
  globalThis.ego.sendCDPMessage = (payload) => {
    const parsed = JSON.parse(payload);
    if (
      parsed.method === "Target.attachToTarget" &&
      parsed.params.targetId === "tab-A"
    ) {
      notifyAttach();
      attachGate.then(() => originalSend(payload));
      return;
    }
    originalSend(payload);
  };
  try {
    const pendingSelection = ensureSession();
    await attachStarted;
    setPreferredTarget("tab-B");
    releaseAttach();
    await assert.rejects(
      pendingSelection,
      /browser target preference changed during session acquisition/,
    );
    assert.equal(state.sessionId, null, "stale attachment must be invalidated");
    await ensureSession();
    assert.equal(state.sessionTargetId, "tab-B");
  } finally {
    releaseAttach();
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  SESSION_LOST retry                                                */
/* ------------------------------------------------------------------ */

// A lost session does not establish document continuity, even on one target.
for (const method of [
  "DOM.getDocument",
  "DOM.getNodeForLocation",
  "DOMSnapshot.captureSnapshot",
  "Page.captureScreenshot",
  "Page.getFrameTree",
  "Page.getNavigationHistory",
]) {
  test(`lost-session read fails closed: ${method}`, async () => {
    const calls = installLostSessionEgo(method);
    try {
      await assert.rejects(() => browserCdp(method, {}), /Session not found/);
      const reads = calls.filter((call) => call.method === method);
      assert.equal(reads.length, 1, "must not replay against another document");
      assert.equal(state.sessionId, null);
    } finally {
      cleanup();
    }
  });
}

test("same-tab navigation never triggers a retry", async () => {
  const calls = installLostSessionEgo("DOM.getDocument", "tab-1");
  const originalSend = globalThis.ego.sendCDPMessage.bind(globalThis.ego);
  globalThis.ego.sendCDPMessage = (payload) => {
    const request = JSON.parse(payload);
    if (request.method === "DOM.getDocument") {
      setTimeout(() => {
        globalThis.ego.onCDPMessage(
          JSON.stringify({
            method: "Page.frameNavigated",
            sessionId: request.sessionId,
            params: {
              frame: {
                id: "main",
                url: "https://changed.example/new-document",
                loaderId: "loader-new",
              },
            },
          }),
        );
      }, 0);
    }
    originalSend(payload);
  };
  try {
    await assert.rejects(
      () => browserCdp("DOM.getDocument", { depth: 1 }),
      /Session not found/,
    );
    const reads = calls.filter((c) => c.method === "DOM.getDocument");
    assert.equal(reads.length, 1);
    assert.equal(state.sessionId, null);
    const eventNames = drainBrowserEvents().map((event) => event.method);
    assert.ok(eventNames.includes("Page.frameNavigated"));
  } finally {
    cleanup();
  }
});

// Observational methods are not automatically replayable when their arguments
// refer to nodes, remote objects, requests, or frames from a lost session.
for (const [method, params] of [
  ["Accessibility.getPartialAXTree", { nodeId: 7 }],
  ["Accessibility.getFullAXTree", { frameId: "old-frame" }],
  ["CSS.getComputedStyleForNode", { nodeId: 7 }],
  ["CSS.getMatchedStylesForNode", { nodeId: 7 }],
  ["DOM.describeNode", { nodeId: 7 }],
  ["DOM.getBoxModel", { nodeId: 7 }],
  ["DOM.getContentQuads", { nodeId: 7 }],
  ["DOM.getOuterHTML", { nodeId: 7 }],
  ["DOM.querySelector", { nodeId: 7, selector: "main" }],
  ["DOM.querySelectorAll", { nodeId: 7, selector: "main" }],
  ["DOM.resolveNode", { nodeId: 7 }],
  ["Network.getResponseBody", { requestId: "old-request" }],
  ["Runtime.getProperties", { objectId: "old-object" }],
]) {
  test(`browserCdp does not replay session-bound ${method} parameters`, async () => {
    const calls = installLostSessionEgo(method);
    try {
      await assert.rejects(
        () => browserCdp(method, params),
        /Session not found/,
      );
      assert.equal(
        calls.filter((call) => call.method === method).length,
        1,
        "a stale identifier must not be sent into a new CDP session",
      );
      assert.equal(state.sessionId, null, "lost session must be invalidated");
    } finally {
      cleanup();
    }
  });
}

for (const method of [
  "Runtime.evaluate",
  "Input.dispatchMouseEvent",
  "Page.navigate",
]) {
  test(`browserCdp does not replay potentially effectful ${method} after session loss`, async () => {
    const calls = installLostSessionEgo(method);
    try {
      await assert.rejects(() => browserCdp(method, {}), /Session not found/);
      assert.equal(
        calls.filter((call) => call.method === method).length,
        1,
        "effectful command must not be sent a second time",
      );
      assert.equal(state.sessionId, null, "failed session must be invalidated");
    } finally {
      cleanup();
    }
  });
}

test("browserCdp does not retry a lost read after active target changes", async () => {
  const calls = installLostSessionEgo("DOM.getDocument", "tab-2");
  try {
    await assert.rejects(
      () => browserCdp("DOM.getDocument", { depth: 1 }),
      /Session not found/,
    );
    assert.equal(
      calls.filter((call) => call.method === "DOM.getDocument").length,
      1,
      "a read must not silently switch to another tab",
    );
    assert.equal(
      calls.filter((call) => call.method === "Target.attachToTarget").length,
      1,
    );
    assert.equal(state.sessionId, null);
  } finally {
    cleanup();
  }
});

test("browserCdp does NOT retry SESSION_LOST for explicit sessionId", async () => {
  const calls = installManualEgo();
  try {
    const promise = browserCdp("Runtime.evaluate", {}, "explicit-sess", 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({
        id: calls[0].id,
        error: { message: "Session not found" },
      }),
    );
    await assert.rejects(promise, /Session not found/);
  } finally {
    cleanup();
  }
});

test("browserCdp does NOT retry SESSION_LOST for browser-level methods", async () => {
  const calls = installManualEgo();
  try {
    const promise = browserCdp("Browser.getVersion", {}, undefined, 5000);
    globalThis.ego.onCDPMessage(
      JSON.stringify({ id: calls[0].id, error: { message: "Target closed" } }),
    );
    await assert.rejects(promise, /Target closed/);
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  handleSendError — rejects all pending on local send failure       */
/* ------------------------------------------------------------------ */

test("handleSendError rejects all pending requests with ego error", async () => {
  installManualEgo();
  try {
    const p1 = browserCdp("Target.getVersion", {}, undefined, 5000);
    const p2 = browserCdp("Browser.getVersion", {}, undefined, 5000);

    globalThis.ego.onSendCDPMessageError(
      "native text",
      "EGO_TASK_SPACE_USER_IN_CONTROL",
    );

    await assert.rejects(p1, (err) => {
      assert.equal(err.error_code, "EGO_TASK_SPACE_USER_IN_CONTROL");
      return true;
    });
    await assert.rejects(p2, (err) => {
      assert.equal(err.error_code, "EGO_TASK_SPACE_USER_IN_CONTROL");
      return true;
    });
  } finally {
    cleanup();
  }
});

/* ------------------------------------------------------------------ */
/*  browserSnapshotRefsToRefMap                                       */
/* ------------------------------------------------------------------ */

test("browserSnapshotRefsToRefMap populates ref map from snapshot refs", () => {
  const refMap = {
    _data: new Map(),
    clear() {
      this._data.clear();
    },
    add(id, backendNodeId, role, name) {
      this._data.set(id, { backendNodeId, role, name });
    },
  };
  browserSnapshotRefsToRefMap(refMap, [
    { backendNodeId: 42, role: "button", name: "Submit" },
    { backendNodeId: 100, role: "link", name: "Home" },
  ]);
  assert.equal(refMap._data.size, 2);
  assert.equal(refMap._data.get("42").role, "button");
  assert.equal(refMap._data.get("100").name, "Home");
});

test("browserSnapshotRefsToRefMap clears the map before populating", () => {
  const refMap = {
    _data: new Map([["old", { backendNodeId: 1 }]]),
    clear() {
      this._data.clear();
    },
    add(id, backendNodeId, role, name) {
      this._data.set(id, { backendNodeId, role, name });
    },
  };
  browserSnapshotRefsToRefMap(refMap, [
    { backendNodeId: 5, role: "textbox", name: "" },
  ]);
  assert.equal(refMap._data.size, 1);
  assert.equal(refMap._data.has("old"), false, "old entries cleared");
});

test("browserSnapshotRefsToRefMap skips null, non-object, and missing backendNodeId refs", () => {
  const refMap = {
    _data: new Map(),
    clear() {
      this._data.clear();
    },
    add(id, backendNodeId, role, name) {
      this._data.set(id, { backendNodeId, role, name });
    },
  };
  browserSnapshotRefsToRefMap(refMap, [
    null,
    "not an object",
    { role: "button" },
    { backendNodeId: null, role: "button" },
    { backendNodeId: undefined, role: "button" },
    { backendNodeId: 7, role: "link", name: "ok" },
  ]);
  assert.equal(refMap._data.size, 1, "only the valid ref is added");
  assert.ok(refMap._data.has("7"));
});
