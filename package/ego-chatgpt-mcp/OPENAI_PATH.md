# OpenAI connection path

## Fastest private path

For an account/workspace that has ChatGPT developer mode and Secure MCP Tunnel access:

1. Keep `ego-chatgpt-mcp` local and stdio-only.
2. Create an OpenAI Platform tunnel and associate it with the target Platform organization / ChatGPT workspace.
3. Run `tunnel-client` on the same machine or trust boundary as ego lite.
4. Configure the tunnel profile to launch `server.mjs` as its local stdio MCP command.
5. Run `tunnel-client doctor` and then `tunnel-client run`.
6. In ChatGPT developer mode, create an app using **Tunnel** as the connection and select the tunnel.
7. First test only `ego_status` and harmless read-only page inspection.

Official docs:
- https://developers.openai.com/api/docs/guides/secure-mcp-tunnels
- https://developers.openai.com/plugins/build/mcp-server
- https://help.openai.com/en/articles/12584461-developer-mode-apps-and-full-mcp-connectors-in-chatgpt-beta

## Current plan constraint

As of 2026-08-29, OpenAI's Help Center says:

- Full MCP including write/modify actions is rolling out to Business, Enterprise, and Edu.
- Pro users can connect MCPs with read/fetch permissions in developer mode.
- The article does not list Plus as supporting private custom MCP developer-mode connections.

Therefore the current read-only Ego bridge is technically aligned with the Pro read/fetch capability, but a Plus account may not be able to attach it privately in ChatGPT today.

## If private developer mode is unavailable

Do not weaken the architecture by opening the local Ego browser directly to the public internet.

Two acceptable paths remain:

1. **Use a supported plan/workspace for private developer-mode testing** (shortest route).
2. **Build a publishable plugin architecture** with a stable public HTTPS MCP endpoint plus a separately authenticated local outbound relay. OpenAI's plugin docs state that Secure MCP Tunnel alone is not sufficient for public plugin submission.

The second path changes the trust boundary and should be a separate reviewed project/PR rather than silently added to the local read-only bridge.
