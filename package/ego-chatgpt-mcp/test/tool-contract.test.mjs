import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const serverSource = await readFile(new URL("../server.mjs", import.meta.url), "utf8");

const contract = {
  ego_status: { required: [], fields: [] },
  ego_open: { required: ["url"], fields: ["url", "task"] },
  ego_snapshot: { required: [], fields: ["task"] },
  ego_scroll: { required: ["delta"], fields: ["delta", "task"] },
  ego_list_tabs: { required: [], fields: ["task"] },
  ego_switch_tab: { required: ["targetId"], fields: ["targetId", "task"] },
  ego_list_links: { required: [], fields: ["task", "limit"] },
  ego_follow_href: { required: ["href"], fields: ["href", "task"] },
  ego_extract_dom: { required: ["selector"], fields: ["selector", "task", "limit"] },
};

function registrationBlock(toolName) {
  const marker = `server.registerTool(\n  "${toolName}"`;
  const start = serverSource.indexOf(marker);
  assert.notEqual(start, -1, `missing MCP tool registration: ${toolName}`);
  const next = serverSource.indexOf("\nserver.registerTool(", start + marker.length);
  return serverSource.slice(start, next === -1 ? serverSource.length : next);
}

function fieldExpression(block, field) {
  const match = block.match(new RegExp(`\\b${field}:\\s*([^\\n}]+)`));
  assert.ok(match, `missing input field ${field}`);
  return match[1].trim();
}

test("published V1 MCP tool names stay stable", () => {
  const names = [...serverSource.matchAll(/server\.registerTool\(\s*\n\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(names, Object.keys(contract));
});

test("published V1 MCP input contract does not silently break", () => {
  for (const [toolName, expected] of Object.entries(contract)) {
    const block = registrationBlock(toolName);

    for (const field of expected.fields) {
      const expression = fieldExpression(block, field);
      const isRequired = !expression.includes(".optional()");
      assert.equal(
        isRequired,
        expected.required.includes(field),
        `${toolName}.${field} required/optional status changed; this is a published MCP contract change and requires explicit version/republication review`,
      );
    }
  }
});

test("published V1 MCP contract preserves critical field types", () => {
  const expectations = {
    "ego_open.url": /z\.string\(\)\.url\(\)/,
    "ego_scroll.delta": /z\.number\(\)\.int\(\)/,
    "ego_switch_tab.targetId": /z\.union\(\[z\.string\(\), z\.number\(\)\]\)/,
    "ego_follow_href.href": /z\.string\(\)/,
    "ego_extract_dom.selector": /z\.string\(\)/,
    "ego_list_links.limit": /z\.number\(\)\.int\(\)/,
    "ego_extract_dom.limit": /z\.number\(\)\.int\(\)/,
  };

  for (const [key, pattern] of Object.entries(expectations)) {
    const [toolName, field] = key.split(".");
    const expression = fieldExpression(registrationBlock(toolName), field);
    assert.match(
      expression,
      pattern,
      `${key} type changed; OpenAI may keep a frozen approved tool schema, so breaking changes need explicit version/republication review`,
    );
  }
});
