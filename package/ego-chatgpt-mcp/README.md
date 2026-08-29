# Ego ChatGPT MCP bridge (prototype)

This package is the first bridge layer between `ego-browser` and an MCP-capable OpenAI host.

## Goal

Allow an agent to verify the *real rendered page* — including pages that depend on the user's existing Ego browser session — without giving the model arbitrary shell access or direct credential access.

This is intentionally **read-only V1**. It can navigate and inspect pages but does not expose form submission, purchases, messages, enrollment/drop actions, deletion, account-setting changes, or arbitrary JavaScript supplied by the model.

## Architecture

For developer-mode use, the preferred path is now OpenAI's **Secure MCP Tunnel**. That means we do **not** need to expose this MCP server publicly or invent our own cloud gateway.

```text
ChatGPT / Codex
      |
      | OpenAI-hosted Secure MCP Tunnel
      v
 tunnel-client  (runs on the user's machine / trusted network)
      |
      | local stdio
      v
 ego-chatgpt-mcp  (this package)
      |
      | fixed ego-browser scripts
      v
 ego-browser -> ego lite task space -> rendered/authenticated webpage
```

`tunnel-client` initiates outbound HTTPS to OpenAI and forwards MCP JSON-RPC locally. The private MCP server does not need inbound internet access.

## Tool surface

- `ego_status` — confirm the local Ego runtime is reachable.
- `ego_open` — open an HTTP(S) page and return a semantic snapshot.
- `ego_snapshot` — re-read the current rendered page.
- `ego_scroll` — scroll and re-read.
- `ego_list_tabs` — list research tabs in the task space.
- `ego_switch_tab` — switch among known tabs.
- `ego_list_links` — extract real links from the current page.
- `ego_follow_href` — navigate only to a known HTTP(S) href.
- `ego_extract_dom` — structured read-only DOM extraction with a bounded CSS selector.

## Security model

1. **Read-only by design.** No generic click/fill/submit tool is exposed in V1.
2. **No arbitrary model-supplied JavaScript.** Browser-side JavaScript is constructed by the bridge from bounded inputs.
3. **HTTP(S) navigation only.** Other URL schemes are rejected.
4. **Bounded output.** Snapshot/stdout limits reduce accidental data flooding and prompt-context blowups.
5. **Isolated task space.** Research is done in an Ego task space rather than the user's normal tabs.
6. **No credential export.** The bridge relies on Ego's browser session; it does not ask the model for cookies/passwords/tokens.
7. **Fail closed.** Timeouts, oversized output, missing Ego runtime, or non-zero process exits are surfaced as errors.
8. **No public browser ingress required.** Secure MCP Tunnel keeps this server private for developer-mode testing.

MCP tool annotations help hosts choose confirmation behavior, but they are not treated as the authorization boundary.

## Local development

Prerequisites:

- Node.js 22+
- ego lite installed and onboarded
- `ego-browser` available on `PATH`

Then:

```bash
cd package/ego-chatgpt-mcp
npm install
npm run check
npm start
```

`npm start` starts a **stdio MCP server**. This is intentional: Secure MCP Tunnel can forward to a local stdio MCP command directly.

## ChatGPT developer-mode path with Secure MCP Tunnel

Official references:

- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- https://developers.openai.com/plugins/build/mcp-server

The external prerequisites are:

- an OpenAI Platform `tunnel_id`;
- a runtime API key authorized to use the tunnel;
- ChatGPT developer-mode access in the target workspace/account;
- `tunnel-client` installed on the same machine/trust boundary that can run `ego-browser`.

The intended local stdio profile looks like this conceptually:

```bash
export CONTROL_PLANE_API_KEY="<set securely outside the repo>"

tunnel-client init \
  --sample sample_mcp_stdio_local \
  --profile ego-chatgpt \
  --tunnel-id "$EGO_TUNNEL_ID" \
  --mcp-command "node /absolute/path/to/ego-lite-andy-/package/ego-chatgpt-mcp/server.mjs"

tunnel-client doctor --profile ego-chatgpt --explain
tunnel-client run --profile ego-chatgpt
```

Do not commit the runtime API key, tunnel credentials, browser cookies, or profile secrets to this repository.

After the tunnel is healthy, create a developer-mode app in ChatGPT and choose **Tunnel** as the connection, then select the associated tunnel. The bridge should remain read-only during the first end-to-end test.

## What still blocks production confidence

Before treating this as a working integration, complete all of the following:

- run `ego_status` through a real tunnel from ChatGPT/Codex;
- verify `ego_open` on a harmless public page;
- verify a logged-in page whose contents are safe to inspect;
- confirm no cookie/password/token values appear in tool outputs;
- exercise invalid URLs, oversized pages, timeout behavior, and unavailable Ego runtime;
- verify the ChatGPT/Platform tunnel permission model for the actual account/workspace;
- decide whether host/domain policy and redaction need to be stricter before using sensitive sites.

Write-capable browser actions remain a separate future change and must not be silently added to this V1.

## Research Router integration

`skills/research-router` should route tasks as follows when this bridge is available:

- broad public discovery -> native web/search;
- dynamic/authenticated/live-page verification -> Ego bridge;
- important decisions -> search + first-party sources + Ego live-page verification + contradiction check;
- if the Ego bridge is unavailable -> say so explicitly and fall back rather than pretending live-page access occurred.

## Merge gate

Keep this PR in draft until a real-machine end-to-end tunnel test passes. Once that happens, the **read-only bridge itself** can be considered for merge. Permission expansion or browser write tools require a separate reviewed change.
