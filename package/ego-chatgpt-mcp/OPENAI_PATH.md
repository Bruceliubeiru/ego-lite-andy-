# OpenAI connection path

## Fastest private path

For an account/workspace that has ChatGPT developer mode and Secure MCP Tunnel access:

1. Keep `ego-chatgpt-mcp` local and stdio-only.
2. Create an OpenAI Platform tunnel and associate it with the target Platform organization / ChatGPT workspace.
3. Run `tunnel-client` on the same machine or trust boundary as ego lite.
4. Obtain `tunnel-client` from OpenAI Platform tunnel settings or the **latest public `openai/tunnel-client` release**. Keep the runbook pointed at the latest-release location rather than hard-coding a specific release URL; verify the installed client with `tunnel-client help quickstart` / `doctor` before use.
5. Configure the tunnel profile to launch `server.mjs` as its local stdio MCP command.
6. Run `tunnel-client doctor` and then `tunnel-client run`.
7. In ChatGPT developer mode, create an app using **Tunnel** as the connection and select the tunnel.
8. First test only `ego_status` and harmless read-only page inspection.

Official docs:
- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- https://developers.openai.com/plugins/build/mcp-server
- https://help.openai.com/en/articles/12584461-developer-mode-and-full-mcp-connectors-in-chatgpt
- https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex

## Current plan constraint

As of 2026-08-30, OpenAI's Help Center says:

- Full MCP including write/modify actions is rolling out to Business, Enterprise, and Edu.
- Pro users can connect MCPs with read/fetch permissions in developer mode.
- The article does not list Plus as supporting private custom MCP developer-mode connections.

Therefore the current read-only Ego bridge is technically aligned with the Pro read/fetch capability, but a Plus account may not be able to attach it privately in ChatGPT today.

## Plugin marketplace is not a plan-gate bypass

OpenAI's current plugin guidance says the plugin directory can appear across ChatGPT plans, but each plugin still depends on the plan/workspace/role availability and authorization of any included app. Installing a plugin does not bypass the underlying app's permissions or setup requirements.

Do **not** treat GitHub marketplace import or a skill/plugin manifest as a way to bypass the custom-MCP developer-mode gate above.

There is an additional packaging trap: OpenAI says an imported plugin that declares MCP servers (for example through `mcp.json` or `.mcp.json`) can be labeled **Desktop only**, even when the MCP URL itself is remote HTTPS. Adding an app reference does not by itself remove that restriction; the referenced app must already be available to the user's role and satisfy its normal authorization requirements.

For this repository, keep these concerns separate unless a reviewed architecture change deliberately combines them:

- `research-router` / `ego-browser` skills may be distributed as skill-only plugin content where supported;
- `ego-chatgpt-mcp` remains an app/MCP integration whose ChatGPT availability is controlled by developer-mode, plan, workspace, and tunnel requirements;
- do not add an MCP declaration to the plugin marketplace merely to make the Ego bridge appear in ChatGPT, because that can reduce web compatibility without solving the underlying plan gate.

This distinction is a compatibility and security guardrail, not a claim that plugin-based MCP packaging can never be appropriate. Re-evaluate it only when OpenAI's official plugin/app behavior changes and an end-to-end web test confirms the target plan and surface.

## If private developer mode is unavailable

Do not weaken the architecture by opening the local Ego browser directly to the public internet.

Two acceptable paths remain:

1. **Use a supported plan/workspace for private developer-mode testing** (shortest route).
2. **Build a publishable plugin architecture** with a stable public HTTPS MCP endpoint plus a separately authenticated local outbound relay. OpenAI's plugin docs state that Secure MCP Tunnel alone is not sufficient for public plugin submission.

The second path changes the trust boundary and should be a separate reviewed project/PR rather than silently added to the local read-only bridge.
