import assert from "node:assert/strict";
import test from "node:test";

import { preflightExitCode } from "../../../scripts/capability-resolution-preflight.mjs";

test("preflight exit code fails closed for missing or unknown statuses", () => {
  assert.equal(preflightExitCode({}), 3);
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "future-status" } },
      app: { status: "observed" },
    }),
    3,
  );
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "bounded-clear" } },
      app: { status: "future-status" },
    }),
    3,
  );
});

test("positive ambiguity still keeps its higher-priority conflict exit code", () => {
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "future-status" } },
      app: { status: "ambiguous" },
    }),
    2,
  );
});
