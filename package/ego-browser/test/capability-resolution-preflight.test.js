import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSkillResolution,
  inspectInstalledApp,
  parseSkillMetadata,
  preflightExitCode,
} from "../../../scripts/capability-resolution-preflight.mjs";

test("parseSkillMetadata extracts bounded frontmatter version and date", () => {
  const source = [
    "---",
    "name: ego-browser",
    "metadata:",
    '  version: "2.0.0"',
    '  date: "2026-09-09"',
    "---",
    "# ego-browser",
    "",
  ].join("\n");

  assert.deepEqual(parseSkillMetadata(source), {
    version: "2.0.0",
    date: "2026-09-09",
  });
});

test("same realpath is not treated as a shadow conflict", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/Applications/ego lite.app/skill/SKILL.md",
      version: "2.0.0",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/Applications/ego lite.app/skill/SKILL.md",
      version: "2.0.0",
    },
  ]);

  assert.equal(result.status, "bounded-clear");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.deepEqual(result.conflicts, []);
});

test("different shadow copy makes effective Skill version ambiguous", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: "2.0.0",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.pi/agent/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.pi/agent/skills/ego-browser/SKILL.md",
      version: "1.2.6",
    },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].version, "1.2.6");
});

test("unreadable shadow path does not become evidence that no conflict exists", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/Applications/ego lite.app/skill/SKILL.md",
      version: "2.0.0",
    },
    {
      role: "shadow-candidate",
      exists: null,
      path: "/home/user/.pi/agent/skills/ego-browser/SKILL.md",
      error: "EACCES",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].error, "EACCES");
});

test("missing canonical path does not promote a shadow copy to negative evidence", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: false,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.claude/skills/ego-browser/SKILL.md",
      version: "1.2.6",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, null);
  assert.equal(result.conflicts.length, 1);
});

test("unreadable app path remains unverified instead of becoming evidence of absence", () => {
  const error = new Error("permission denied");
  error.code = "EACCES";
  const result = inspectInstalledApp(
    ["/Applications/ego lite.app/Contents/Info.plist"],
    {
      lstatSync() {
        throw error;
      },
    },
  );

  assert.equal(result.status, "unverified");
  assert.equal(result.installations.length, 1);
  assert.equal(result.installations[0].error, "EACCES");
  assert.match(result.reason, /acquisition failure/i);
});

test("preflight exit code keeps ambiguous and unverified results non-successful", () => {
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "ambiguous" } },
      app: { status: "observed" },
    }),
    2,
  );
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "unverified" } },
      app: { status: "observed" },
    }),
    3,
  );
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "bounded-clear" } },
      app: { status: "unverified" },
    }),
    3,
  );
});

test("preflight exits successfully only when bounded checks are conclusive", () => {
  assert.equal(
    preflightExitCode({
      skill: { resolution: { status: "bounded-clear" } },
      app: { status: "observed" },
    }),
    0,
  );
});
