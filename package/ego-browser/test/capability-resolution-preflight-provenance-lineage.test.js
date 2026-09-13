import assert from "node:assert/strict";
import test from "node:test";

import { evaluateSkillResolution } from "../../../scripts/capability-resolution-preflight.mjs";

test("byte-identical Skill copies at distinct realpaths remain provenance-unverified", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "same-digest",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.claude/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "same-digest",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.lineageVariants.length, 1);
  assert.equal(
    result.lineageVariants[0].realpath,
    "/home/user/.claude/skills/ego-browser/SKILL.md",
  );
  assert.match(result.reason, /distinct resolved paths/i);
  assert.match(result.reason, /relative supporting assets/i);
});

test("same realpath still collapses to one Skill lineage", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/Applications/ego lite.app/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "same-digest",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/Applications/ego lite.app/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "same-digest",
    },
  ]);

  assert.equal(result.status, "bounded-clear");
  assert.deepEqual(result.conflicts, []);
  assert.equal(result.lineageVariants, undefined);
});
