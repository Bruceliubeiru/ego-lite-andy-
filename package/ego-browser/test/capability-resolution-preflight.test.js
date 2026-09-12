import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSkillResolution,
  parseSkillMetadata,
} from '../../../scripts/capability-resolution-preflight.mjs';

test('parseSkillMetadata extracts bounded frontmatter version and date', () => {
  const source = [
    '---',
    'name: ego-browser',
    'metadata:',
    '  version: "2.0.0"',
    '  date: "2026-09-09"',
    '---',
    '# ego-browser',
    '',
  ].join('\n');

  assert.deepEqual(parseSkillMetadata(source), {
    version: '2.0.0',
    date: '2026-09-09',
  });
});

test('same realpath is not treated as a shadow conflict', () => {
  const result = evaluateSkillResolution([
    {
      role: 'canonical',
      exists: true,
      path: '/home/user/.agents/skills/ego-browser/SKILL.md',
      realpath: '/Applications/ego lite.app/skill/SKILL.md',
      version: '2.0.0',
    },
    {
      role: 'shadow-candidate',
      exists: true,
      path: '/home/user/.claude/skills/ego-browser/SKILL.md',
      realpath: '/Applications/ego lite.app/skill/SKILL.md',
      version: '2.0.0',
    },
  ]);

  assert.equal(result.status, 'bounded-clear');
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, '2.0.0');
  assert.deepEqual(result.conflicts, []);
});

test('different shadow copy makes effective Skill version ambiguous', () => {
  const result = evaluateSkillResolution([
    {
      role: 'canonical',
      exists: true,
      path: '/home/user/.agents/skills/ego-browser/SKILL.md',
      realpath: '/home/user/.agents/skills/ego-browser/SKILL.md',
      version: '2.0.0',
    },
    {
      role: 'shadow-candidate',
      exists: true,
      path: '/home/user/.pi/agent/skills/ego-browser/SKILL.md',
      realpath: '/home/user/.pi/agent/skills/ego-browser/SKILL.md',
      version: '1.2.6',
    },
  ]);

  assert.equal(result.status, 'ambiguous');
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, '2.0.0');
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].version, '1.2.6');
});

test('missing canonical path does not promote a shadow copy to negative evidence', () => {
  const result = evaluateSkillResolution([
    {
      role: 'canonical',
      exists: false,
      path: '/home/user/.agents/skills/ego-browser/SKILL.md',
    },
    {
      role: 'shadow-candidate',
      exists: true,
      path: '/home/user/.claude/skills/ego-browser/SKILL.md',
      realpath: '/home/user/.claude/skills/ego-browser/SKILL.md',
      version: '1.2.6',
    },
  ]);

  assert.equal(result.status, 'unverified');
  assert.equal(result.effectiveVersion, null);
  assert.equal(result.candidateVersion, null);
  assert.equal(result.conflicts.length, 1);
});
