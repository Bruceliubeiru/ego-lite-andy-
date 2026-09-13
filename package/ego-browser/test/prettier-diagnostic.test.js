import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import prettier from "prettier";

test("print canonical formatting for provenance regression", async () => {
  const target = "test/capability-resolution-preflight-symlink-scope.test.js";
  const source = fs.readFileSync(target, "utf8");
  const formatted = await prettier.format(source, { filepath: target });
  console.error("PRETTIER_CANONICAL_START\n" + formatted + "PRETTIER_CANONICAL_END");
  assert.fail("diagnostic-only failure");
});
