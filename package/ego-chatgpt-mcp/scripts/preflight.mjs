import { spawnSync } from "node:child_process";

function exists(command, args = ["--help"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    env: process.env,
    timeout: 5000,
  });
  return !result.error;
}

function yesNo(value) {
  return value ? "ok" : "missing";
}

const checks = {
  node22: Number(process.versions.node.split(".")[0]) >= 22,
  egoBrowser: exists(process.env.EGO_BROWSER_BIN || "ego-browser", ["--help"]),
  tunnelClient: exists("tunnel-client", ["help", "quickstart"]),
  tunnelId: Boolean(process.env.EGO_TUNNEL_ID),
  controlPlaneKey: Boolean(process.env.CONTROL_PLANE_API_KEY),
};

console.log(`Node >=22: ${yesNo(checks.node22)} (${process.versions.node})`);
console.log(`ego-browser: ${yesNo(checks.egoBrowser)}`);
console.log(`tunnel-client: ${yesNo(checks.tunnelClient)}`);
console.log(`EGO_TUNNEL_ID: ${yesNo(checks.tunnelId)}`);
console.log(`CONTROL_PLANE_API_KEY: ${yesNo(checks.controlPlaneKey)} (value never printed)`);

if (!checks.node22 || !checks.egoBrowser) {
  console.error("Local Ego MCP runtime is not ready.");
  process.exit(2);
}

if (!checks.tunnelClient || !checks.tunnelId || !checks.controlPlaneKey) {
  console.error("Local MCP works, but Secure MCP Tunnel setup is incomplete.");
  process.exit(3);
}

console.log("Preflight passed: local Ego runtime and Secure MCP Tunnel prerequisites are present.");
