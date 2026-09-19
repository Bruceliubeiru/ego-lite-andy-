import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSkillResolution,
  preflightExitCode,
} from "../../../scripts/capability-resolution-preflight.mjs";

test("readable canonical Skill without declared version remains unverified", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: null,
      digest: "canonical-digest",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, null);
  assert.match(result.reason, /version metadata was missing/i);

  assert.equal(
    preflightExitCode({
      skill: { resolution: result },
      app: { status: "observed" },
    }),
    3,
  );
});

test("known content conflict still wins over missing canonical version metadata", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: null,
      digest: "canonical-digest",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.claude/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "different-digest",
    },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.candidateVersion, null);
  assert.equal(result.conflicts.length, 1);
});
