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
- https://developers.openai.com/api/docs/guides/developer-mode
- https://developers.openai.com/plugins/build/mcp-server
- https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt
- https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex

## Current MCP tool-contract note

OpenAI's current Developer Mode / MCP guidance says connected MCP servers do **not** need tools named `search` and `fetch`.

For this bridge, that means:

- keep the narrow `ego_*` read-only tool surface instead of adding generic `search` / `fetch` wrappers only for perceived ChatGPT compatibility;
- do not broaden a tool's authority merely to fit an old naming convention;
- continue treating Deep Research as read/fetch-only when that exact surface imposes that restriction;
- if a future OpenAI surface imposes a different contract, verify that requirement against current first-party documentation and the exact target plan/surface before changing the published MCP schema.

This is a compatibility and least-authority guardrail. It is **not** a reason to add write-capable Ego tools.

## Current plan gate: Plus Developer Mode is documented; target-account Tunnel attachment still needs proof

As of 2026-09-03, OpenAI's dedicated Developer Mode guide explicitly lists **Pro, Plus, Business, Enterprise, and Education** accounts as eligible on the web and describes Developer Mode as full MCP client support for all tools, including read and write. That is direct Plus-specific first-party evidence, so the public-documentation gate is no longer closed.

However, the current Help Center workspace article still says Apps, full MCP support, and Developer Mode are available for Business and Enterprise/Edu. Preserve that first-party conflict rather than pretending rollout/account state is universal.

Secure MCP Tunnel permissions also remain separate from ChatGPT Developer Mode eligibility. A working Platform tunnel does not by itself prove that a particular ChatGPT account can attach it.

### Plus validation sequence — now allowed at the lowest-risk account level

The documentation gate is open enough to attempt the following verification on the target Plus account, without widening any bridge permissions:

1. Confirm the target account exposes **Developer mode**.
2. Confirm the ChatGPT Apps surface allows creating a custom developer-mode app.
3. Confirm **Tunnel** is offered as the connection path.
4. Confirm the intended tunnel can be selected for that account/workspace.
5. Run `tunnel-client doctor --profile ego-chatgpt --explain` locally.
6. Test only `ego_status` first.
7. Then verify one harmless public page through `ego_open`.
8. Only after the bridge's private-network/redirect boundary is fixed, test authenticated pages.

If any account-level UI step is absent, record the gate as rollout/account-specific rather than falling back to a public relay or weakening network boundaries.

The Developer Mode guide documents write-capable MCP support, but that does **not** change this bridge's V1 authority: keep it read-only. Permission expansion, browser writes, or credential-capable tools require separate review.

## Plugin marketplace is not a plan-gate bypass

OpenAI's current plugin guidance says the plugin directory can appear across ChatGPT plans, but each plugin still depends on the plan/workspace/role availability and authorization of any included app. Installing a plugin does not bypass the underlying app's permissions or setup requirements.

Do **not** treat GitHub marketplace import or a skill/plugin manifest as a way to bypass account-level app authorization.

There is an additional packaging trap: an imported plugin that declares MCP servers can be constrained by its packaging/surface rules even when the MCP URL itself is remote HTTPS. Adding an app reference does not by itself remove normal availability or authorization requirements.

For this repository, keep these concerns separate unless a reviewed architecture change deliberately combines them:

- `research-router` / `ego-browser` skills may be distributed as skill-only plugin content where supported;
- `ego-chatgpt-mcp` remains an app/MCP integration whose ChatGPT availability is controlled by Developer Mode, account/workspace state, and tunnel permissions;
- do not add an MCP declaration to the plugin marketplace merely to make the Ego bridge appear in ChatGPT.

## If private developer mode is unavailable on the target account

Do not weaken the architecture by opening the local Ego browser directly to the public internet.

Two acceptable paths remain:

1. Use another explicitly supported account/workspace for private developer-mode testing.
2. Build a publishable plugin architecture with a stable public HTTPS MCP endpoint plus a separately authenticated local outbound relay.

The second path changes the trust boundary and must remain a separate reviewed project/PR rather than being silently added to the local read-only bridge.
