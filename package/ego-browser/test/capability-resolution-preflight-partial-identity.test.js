import assert from "node:assert/strict";
import test from "node:test";

import { evaluateAppIdentity } from "../../../scripts/capability-resolution-preflight.mjs";

test("matching known app fields plus missing metadata remain unverified", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: "200",
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: null,
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.match(result.reason, /incomplete identity metadata/i);
});

test("a single readable app with incomplete identity remains unverified", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: null,
    },
  ]);

  assert.equal(result.status, "unverified");
});

test("a successfully inspected app with no identity fields is not mislabeled acquisition failure", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      realpath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: null,
      build: null,
    },
  ]);

  assert.equal(result.status, "unverified");
  assert.match(result.reason, /successfully inspected/i);
  assert.match(result.reason, /incomplete identity metadata/i);
  assert.doesNotMatch(result.reason, /could not be inspected/i);
});

test("positive app identity conflict remains ambiguous despite missing fields", () => {
  const result = evaluateAppIdentity([
    {
      plistPath: "/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "2.0.0",
      build: null,
    },
    {
      plistPath: "/Users/test/Applications/ego lite.app/Contents/Info.plist",
      shortVersion: "1.2.6",
      build: null,
    },
  ]);

  assert.equal(result.status, "ambiguous");
});
