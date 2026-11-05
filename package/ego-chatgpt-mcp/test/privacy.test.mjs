import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

test("DOM extraction never exports live form values", () => {
  const start = source.indexOf("async function egoExtract");
  assert.notEqual(start, -1, "egoExtract implementation missing");
  const end = source.indexOf("\nconst server = new McpServer", start);
  const block = source.slice(start, end === -1 ? source.length : end);

  assert.equal(
    /\bel\.value\b/.test(block),
    false,
    "ego_extract_dom must not export INPUT/TEXTAREA/SELECT .value because authenticated pages can contain passwords, tokens, personal data, or other secrets",
  );
});
