import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

const expectedTools = [
  "ego_status",
  "ego_open",
  "ego_snapshot",
  "ego_scroll",
  "ego_list_tabs",
  "ego_switch_tab",
  "ego_list_links",
  "ego_follow_href",
  "ego_extract_dom",
];

test("V1 exposes only the expected read-only tools", () => {
  const names = [...source.matchAll(/server\.registerTool\(\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, expectedTools);
});

test("V1 does not expose browser mutation helpers", () => {
  const forbidden = [
    "fillInput(",
    "typeText(",
    "pressKey(",
    "uploadFile(",
    "doubleClick(",
    "dragMouse(",
    "browserFetch(",
    "serverFetch(",
  ];

  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden helper present: ${token}`);
  }
});

test("V1 rejects non-http navigation at the bridge boundary", () => {
  assert.match(source, /url\.protocol !== "https:" && url\.protocol !== "http:"/);
  assert.match(source, /Only http\/https URLs are allowed/);
});

test("V1 marks advertised tools read-only", () => {
  assert.match(source, /readOnlyHint:\s*true/);
  assert.match(source, /destructiveHint:\s*false/);
});
