import test from "node:test";
import { readFile } from "node:fs/promises";
import { format } from "prettier";

test("temporary formatting diagnostic", async () => {
  for (const path of ["src/browser-runtime.test.mjs", "src/browser-runtime.ts"]) {
    const original = await readFile(path, "utf8");
    const formatted = await format(original, { filepath: path });
    if (original === formatted) continue;
    const actual = original.split("\n");
    const expected = formatted.split("\n");
    let index = 0;
    while (index < actual.length && actual[index] === expected[index]) index += 1;
    console.log("FORMAT_DIFF", path, "LINE", index + 1);
    console.log("ACTUAL", JSON.stringify(actual.slice(index, index + 16)));
    console.log("EXPECTED", JSON.stringify(expected.slice(index, index + 16)));
  }
});
