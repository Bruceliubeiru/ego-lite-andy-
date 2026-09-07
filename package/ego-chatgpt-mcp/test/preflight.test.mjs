import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const preflight = resolve("scripts/preflight.mjs");

function runWithTunnelExit(exitCode) {
  const dir = mkdtempSync(join(tmpdir(), "ego-preflight-"));
  const tunnelClient = join(dir, "tunnel-client");
  writeFileSync(
    tunnelClient,
    `#!/usr/bin/env node\nprocess.exit(${exitCode});\n`,
    "utf8",
  );
  chmodSync(tunnelClient, 0o755);

  try {
    return spawnSync(process.execPath, [preflight], {
      cwd: resolve("."),
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${dir}${delimiter}${process.env.PATH || ""}`,
        EGO_BROWSER_BIN: process.execPath,
        EGO_TUNNEL_ID: "test-tunnel",
        CONTROL_PLANE_API_KEY: "test-key",
      },
      timeout: 10000,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("preflight rejects an installed tunnel-client that exits non-zero", () => {
  const result = runWithTunnelExit(9);
  assert.equal(result.status, 3, result.stderr || result.stdout);
  assert.match(result.stdout, /tunnel-client: missing/);
});

test("preflight accepts successful command probes", () => {
  const result = runWithTunnelExit(0);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Preflight passed/);
});
