import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateAppIdentity,
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

test("same-version shadow with different content identity remains ambiguous", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "canonical-digest",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.claude/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "modified-copy-digest",
    },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].digest, "modified-copy-digest");
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

test("known Skill conflict remains ambiguous even with another unreadable shadow", () => {
  const result = evaluateSkillResolution([
    {
      role: "canonical",
      exists: true,
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.agents/skills/ego-browser/SKILL.md",
      version: "2.0.0",
      digest: "canonical-digest",
    },
    {
      role: "shadow-candidate",
      exists: true,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.claude/skills/ego-browser/SKILL.md",
      version: "1.2.6",
      digest: "stale-digest",
    },
    {
      role: "shadow-candidate",
      exists: null,
      path: "/home/user/.pi/agent/skills/ego-browser/SKILL.md",
      error: "EACCES",
    },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].version, "1.2.6");
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

test("readable app identity plus unreadable known path remains unverified", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      error: "EACCES",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.installations.length, 2);
  assert.match(result.reason, /another installation is absent/i);
});

test("known conflicting app identities remain ambiguous even with another unreadable path", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "1.2.6",
      build: "126",
    },
    {
      plistPath: "/Volumes/unknown/ego lite.app/Contents/Info.plist",
      error: "EACCES",
    },
  ]);

  assert.equal(result.status, "ambiguous");
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
