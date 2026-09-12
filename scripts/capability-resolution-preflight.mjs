#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const SKILL_RELATIVE = path.join('skills', 'ego-browser', 'SKILL.md');

export function parseSkillMetadata(text) {
  if (typeof text !== 'string') return { version: null, date: null };
  const frontmatter = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatter) return { version: null, date: null };
  const body = frontmatter[1];
  const version = body.match(/^\s*version:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim() ?? null;
  const date = body.match(/^\s*date:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim() ?? null;
  return { version, date };
}

export function buildSkillCandidates({ homeDir = os.homedir(), cwd = process.cwd() } = {}) {
  return [
    {
      role: 'canonical',
      path: path.join(homeDir, '.agents', SKILL_RELATIVE),
      source: 'canonical user skill path',
    },
    {
      role: 'shadow-candidate',
      path: path.join(homeDir, '.pi', 'agent', SKILL_RELATIVE),
      source: 'Pi user skill path',
    },
    {
      role: 'shadow-candidate',
      path: path.join(homeDir, '.claude', SKILL_RELATIVE),
      source: 'Claude user skill path',
    },
    {
      role: 'shadow-candidate',
      path: path.join(cwd, '.agents', SKILL_RELATIVE),
      source: 'project .agents skill path',
    },
    {
      role: 'shadow-candidate',
      path: path.join(cwd, '.pi', SKILL_RELATIVE),
      source: 'project .pi skill path',
    },
  ];
}

export function inspectSkillPath(candidate, fsApi = fs) {
  try {
    const stat = fsApi.lstatSync(candidate.path);
    const realpath = fsApi.realpathSync(candidate.path);
    const text = fsApi.readFileSync(candidate.path, 'utf8');
    const metadata = parseSkillMetadata(text);
    return {
      ...candidate,
      exists: true,
      symlink: stat.isSymbolicLink(),
      realpath,
      version: metadata.version,
      date: metadata.date,
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { ...candidate, exists: false };
    }
    return {
      ...candidate,
      exists: null,
      error: error?.code || error?.message || String(error),
    };
  }
}

export function evaluateSkillResolution(observations) {
  const canonical = observations.find((item) => item.role === 'canonical');
  const presentShadows = observations.filter(
    (item) => item.role === 'shadow-candidate' && item.exists === true,
  );

  if (!canonical || canonical.exists !== true) {
    return {
      status: 'unverified',
      effectiveVersion: null,
      reason: 'canonical skill path was not readable',
      conflicts: presentShadows.map((item) => item.path),
    };
  }

  const conflicts = presentShadows.filter((item) => {
    if (item.realpath && canonical.realpath && item.realpath === canonical.realpath) return false;
    if (!item.version || !canonical.version) return true;
    return item.version !== canonical.version;
  });

  if (conflicts.length > 0) {
    return {
      status: 'ambiguous',
      effectiveVersion: null,
      canonicalVersion: canonical.version,
      reason: 'known host/project skill copies can shadow the canonical path',
      conflicts: conflicts.map((item) => ({
        path: item.path,
        version: item.version ?? null,
        realpath: item.realpath ?? null,
      })),
    };
  }

  return {
    status: 'bounded-verified',
    effectiveVersion: canonical.version,
    canonicalVersion: canonical.version,
    reason:
      'no conflicting copy was found in the bounded, documented shadow paths checked by this preflight',
    conflicts: [],
  };
}

export function buildAppCandidates({ homeDir = os.homedir() } = {}) {
  return [
    path.join('/Applications', 'ego lite.app', 'Contents', 'Info.plist'),
    path.join(homeDir, 'Applications', 'ego lite.app', 'Contents', 'Info.plist'),
  ];
}

function readPlistKey(plistPath, key) {
  return execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', plistPath], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

export function inspectInstalledApp(plistPaths, fsApi = fs) {
  const observed = [];
  for (const plistPath of plistPaths) {
    if (!fsApi.existsSync(plistPath)) continue;
    try {
      observed.push({
        plistPath,
        shortVersion: readPlistKey(plistPath, 'CFBundleShortVersionString') || null,
        build: readPlistKey(plistPath, 'CFBundleVersion') || null,
      });
    } catch (error) {
      observed.push({
        plistPath,
        error: error?.code || error?.message || String(error),
      });
    }
  }

  if (observed.length === 0) {
    return {
      status: 'unverified',
      reason: 'ego lite Info.plist was not found in the two documented install locations',
      installations: [],
    };
  }

  const readable = observed.filter((item) => item.shortVersion || item.build);
  const identities = new Set(readable.map((item) => `${item.shortVersion ?? ''}:${item.build ?? ''}`));
  return {
    status: identities.size > 1 ? 'ambiguous' : readable.length > 0 ? 'observed' : 'unverified',
    reason:
      identities.size > 1
        ? 'multiple installed ego lite app bundles report different build identities'
        : 'installed app identity observed; this does not prove which build is currently executing',
    installations: observed,
  };
}

export function runPreflight({ homeDir = os.homedir(), cwd = process.cwd(), fsApi = fs } = {}) {
  const skillObservations = buildSkillCandidates({ homeDir, cwd }).map((candidate) =>
    inspectSkillPath(candidate, fsApi),
  );
  const skillResolution = evaluateSkillResolution(skillObservations);
  const app = inspectInstalledApp(buildAppCandidates({ homeDir }), fsApi);

  return {
    schemaVersion: 1,
    scope: {
      skillPaths: 'bounded documented canonical/shadow paths only',
      appPaths: 'documented /Applications and ~/Applications ego lite bundles only',
      excludes: ['credentials', 'cookies', 'browser profiles', 'history', 'unrelated filesystem state'],
    },
    skill: {
      resolution: skillResolution,
      observations: skillObservations,
    },
    app,
    confidenceNote:
      'bounded-verified means no conflict was found in the documented paths checked; it is not proof of every host-specific precedence rule. Installed app identity is not runtime process identity.',
  };
}

function main() {
  const report = runPreflight();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.skill.resolution.status === 'ambiguous' || report.app.status === 'ambiguous') {
    process.exitCode = 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main();
}
