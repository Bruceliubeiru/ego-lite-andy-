import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSkillResolution,
  inspectSkillPath,
} from "../../../scripts/capability-resolution-preflight.mjs";

test("unscoped Skill symlink target is not read", () => {
  let readAttempted = false;
  const observation = inspectSkillPath(
    {
      role: "shadow-candidate",
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      source: "Claude user skill path",
    },
    {
      lstatSync() {
        return { isSymbolicLink: () => true };
      },
      realpathSync() {
        return "/home/user/.ssh/id_ed25519";
      },
      readFileSync() {
        readAttempted = true;
        throw new Error("unscoped target must not be read");
      },
    },
    {
      allowedSymlinkTargets: [
        "/home/user/.agents/skills/ego-browser/SKILL.md",
        "/Applications/ego lite.app",
      ],
    },
  );

  assert.equal(readAttempted, false);
  assert.equal(observation.exists, null);
  assert.equal(observation.symlink, true);
  assert.equal(observation.error, "UNSCOPED_SYMLINK_TARGET");
  assert.equal(observation.realpath, "/home/user/.ssh/id_ed25519");
});

test("documented ego lite app Skill symlink target remains readable", () => {
  const source = [
    "---",
    "name: ego-browser",
    'version: "2.0.0"',
    "---",
    "# ego-browser",
    "",
  ].join("\n");
  let readCount = 0;

  const observation = inspectSkillPath(
    {
      role: "canonical",
      path: "/home/user/.agents/skills/ego-browser/SKILL.md",
      source: "canonical user skill path",
    },
    {
      lstatSync() {
        return { isSymbolicLink: () => true };
      },
      realpathSync() {
        return "/Applications/ego lite.app/Contents/Resources/skills/ego-browser/SKILL.md";
      },
      readFileSync() {
        readCount += 1;
        return source;
      },
    },
    {
      allowedSymlinkTargets: ["/Applications/ego lite.app"],
    },
  );

  assert.equal(readCount, 1);
  assert.equal(observation.exists, true);
  assert.equal(observation.version, "2.0.0");
});

test("unscoped shadow symlink keeps bounded resolution unverified", () => {
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
      exists: null,
      path: "/home/user/.claude/skills/ego-browser/SKILL.md",
      realpath: "/home/user/.ssh/id_ed25519",
      error: "UNSCOPED_SYMLINK_TARGET",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, "2.0.0");
  assert.equal(result.conflicts[0].error, "UNSCOPED_SYMLINK_TARGET");
});
