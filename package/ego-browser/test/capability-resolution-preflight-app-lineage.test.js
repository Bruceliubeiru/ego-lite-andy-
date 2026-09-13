import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAppIdentity } from "../../../scripts/capability-resolution-preflight.mjs";

test("matching app metadata at distinct resolved installations remains provenance-unverified", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      realpath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      realpath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.match(result.reason, /distinct resolved installation provenance/i);
  assert.match(result.reason, /executable\/runtime identity/i);
});

test("multiple aliases resolving to one app installation remain observed", () => {
  const resolved = "/Applications/ego lite.app/Contents/Info.plist";
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      realpath: resolved,
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      realpath: resolved,
      shortVersion: "2.0.0",
      build: "200",
    },
  ]);

  assert.equal(result.status, "observed");
});

test("positive identity conflict still outranks distinct installation provenance", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      realpath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      realpath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.1",
      build: "201",
    },
  ]);

  assert.equal(result.status, "ambiguous");
  assert.match(result.reason, /conflicting known identity fields/i);
});
