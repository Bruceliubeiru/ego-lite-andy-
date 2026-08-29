# Ego ChatGPT MCP bridge (prototype)

This package is the first bridge layer between `ego-browser` and an MCP-capable OpenAI host.

## Goal

Allow an agent to verify the *real rendered page* — including pages that depend on the user's existing Ego browser session — without giving the model arbitrary shell access or direct credential access.

This is intentionally **read-only V1**. It can navigate and inspect pages but does not expose form submission, purchases, messages, enrollment/drop actions, deletion, account-setting changes, or arbitrary JavaScript supplied by the model.

## Current architecture

```text
OpenAI host / MCP client
        |
        | MCP tools
        v
 ego-chatgpt-mcp (this package)
        |
        | spawn fixed ego-browser scripts
        v
    ego-browser
        |
        v
 ego lite task space
        |
        v
 rendered/authenticated webpage
```

The bridge exposes a deliberately narrow tool surface:

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

`npm start` currently starts a **stdio MCP server**. A stdio server is useful for local MCP clients and development, but it is **not yet the remote HTTPS transport needed for a ChatGPT-hosted integration**.

## What is deliberately missing

The following must be designed and reviewed before this can become a real ChatGPT-facing bridge:

- authenticated remote MCP/HTTPS transport;
- local-to-cloud rendezvous/tunnel strategy that does not expose the Ego browser directly to the public internet;
- device/session binding and revocation;
- origin/host allowlists or policy controls for sensitive sites;
- rate limiting and audit logging;
- explicit redaction rules for secrets and highly sensitive page content;
- end-to-end tests against a real Ego runtime;
- packaging/deployment instructions for the supported OpenAI host.

Those are intentionally not hidden behind a "maximum permission" switch. They change the trust boundary and should remain reviewable.

## Research Router integration

`skills/research-router` should route tasks as follows when this bridge is available:

- broad public discovery -> native web/search;
- dynamic/authenticated/live-page verification -> Ego bridge;
- important decisions -> search + first-party sources + Ego live-page verification + contradiction check;
- if the Ego bridge is unavailable -> say so explicitly and fall back rather than pretending live-page access occurred.

## Next milestone

The next milestone is a **secure remote transport prototype** with explicit authentication and a local outbound connection model. Until then this package should stay on a review branch / PR rather than be treated as a production ChatGPT connector.
