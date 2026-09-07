import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

function blockBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  return source.slice(start, end === -1 ? source.length : end);
}

test("direct navigation does not expose localhost/private-network pages by default", () => {
  const block = blockBetween("function ensureHttpUrl", "function boundedText");

  assert.match(
    block,
    /(localhost|loopback)/i,
    "ego_open currently accepts localhost/loopback URLs; authenticated browser access must not become a model-readable local-network fetch surface by default",
  );
  assert.match(
    block,
    /(private|link.?local|127\.|10\.|172\.|192\.168|::1|fc00|fd00)/i,
    "ego_open needs an explicit private/link-local network policy rather than protocol-only validation",
  );
});

test("hostname policy is resolution-aware rather than a text-only denylist", () => {
  const block = blockBetween("function ensureHttpUrl", "function boundedText");

  assert.match(
    block,
    /(dns|lookup|resolve)/i,
    "a hostname string check is insufficient: a public-looking hostname can resolve or re-resolve to loopback/private/link-local addresses; validate resolved destinations fail-closed",
  );
});

test("href navigation is subject to the same network boundary as direct open", () => {
  const block = blockBetween("async function egoFollowHref", "async function egoExtract");

  assert.match(
    block,
    /(ensureHttpUrl|private|localhost|loopback)/i,
    "ego_follow_href must not bypass the direct-navigation network boundary",
  );
});

test("redirects cannot bypass the private-network boundary", () => {
  const navigation = [
    blockBetween("async function egoOpen", "async function egoSnapshot"),
    blockBetween("async function egoFollowHref", "async function egoExtract"),
  ].join("\n");

  assert.match(
    navigation,
    /(redirect|requestInterception|Fetch\.enable|Network\.requestWillBeSent|willNavigate|navigationPolicy)/i,
    "checking only the initial URL is insufficient: a public URL can redirect into localhost/private/link-local space before content is read; enforce the boundary on every navigation hop",
  );
});
