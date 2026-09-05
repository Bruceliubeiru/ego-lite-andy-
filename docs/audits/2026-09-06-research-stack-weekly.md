# Research Stack Weekly Audit — 2026-09-06

## Scope

Sunday deep audit of the BruceAI research stack centered on `Bruceliubeiru/ego-lite-andy-`, covering current OpenAI ChatGPT Developer Mode/MCP guidance, Secure MCP Tunnel boundary assumptions, Apps SDK/plugin integration implications, ego-lite upstream releases/issues, browser verification reliability, and the standing research-router regressions.

## Integration gates

1. **ChatGPT Plus private custom MCP / Secure MCP Tunnel gate: closed/unconfirmed.** Current first-party ChatGPT guidance documents Pro read/fetch MCP access in developer mode and full MCP for Business/Enterprise/Edu. Plus is not listed for that developer-mode MCP entitlement. Platform-level Tunnel access must remain separate from ChatGPT account/workspace entitlement.
2. **ego-lite Windows/Linux runtime gate: closed.** Latest official ego-browser release remains `v1.2.3`; upstream README still says macOS today with Windows/Linux on the roadmap. Windows work is active upstream, but no official Windows or Linux runtime release is available yet.

## Best worthwhile upgrade implemented

Added a supplemental authenticated-browser regression gate: `authenticated-page-verification-vs-auth-mechanism-support`.

Why: upstream reports show that ego-lite can reuse an existing authenticated browser profile while still lacking OS/browser entitlement-dependent authentication mechanisms such as platform passkeys or iCloud Passwords integration. A failed fresh-login ceremony therefore must not be interpreted as account ineligibility, bad credentials, or a negative account-specific result.

Required behavior now:
- distinguish existing-session reuse from fresh-auth capability;
- verify runtime support for the site's authentication mechanism before relying on Ego for account-specific evidence;
- never compensate by exporting credentials/cookies, weakening authentication, or bypassing site security;
- downgrade the account-specific claim to unverified when the runtime itself blocks authentication.

## Evidence and failure modes reviewed

- OpenAI current Developer Mode guide: Pro read/fetch custom MCP; full MCP limited to Business and Enterprise/Edu; connected servers no longer require tools literally named `search`/`fetch`; local/private MCP servers require Secure MCP Tunnel in supported products.
- ego-lite latest stable release remains `v1.2.3` (published 2026-08-11).
- Upstream README still says macOS only today; Windows/Linux remain roadmap items.
- Windows work is active, but current issues still request/track Windows support rather than showing an official shipped runtime.
- Upstream browser issues reinforce existing gates around ownership handoff, task-space lifecycle, browser-global cookie/CDP scope, and postcondition verification.
- New authentication-specific upstream issues show platform passkey and iCloud Passwords/browser credential-provider gaps on macOS; this is distinct from ordinary session-cookie reuse.

## Rejected candidate changes

### 1. Auto-build a public/local relay to bypass the ChatGPT Plus MCP gate
Rejected. It expands exposure and changes the security boundary instead of solving account entitlement. Current policy remains: do not compensate for a closed ChatGPT entitlement gate with a relay or broader permissions.

### 2. Treat upstream-main ego skill metadata/version as an available runtime upgrade
Rejected. Upstream main advertises newer skill metadata than the latest official `v1.2.3` release. Existing `upstream-main-vs-released-installed-version` regression remains correct: unreleased/main behavior is not proof of installed capability.

### 3. Add automatic reclamation of old Ego task spaces by age
Rejected for now. Existing upstream reports still lack a trustworthy activity timestamp and concurrent workflows may own apparently old spaces. Keep explicit release of spaces created by the current workflow; do not bulk-close ambiguous spaces.

### 4. Use raw CDP cookie/profile inspection to recover blocked authentication
Rejected. Current upstream security/isolation issues show browser/profile-global cookie access can cross intended boundaries. Authentication verification should fail closed rather than read/export broader credential state.

### 5. Promote the current authenticated-browser finding into a runtime behavioral patch
Rejected. The browser app/OS entitlement limitations are upstream/native-browser concerns; the safe local improvement is an evidence-routing regression, not a permission or authentication workaround.

## Current capability gaps

- No confirmed ChatGPT Plus entitlement for private custom MCP developer-mode read/fetch or Secure MCP Tunnel attachment.
- No official ego-lite Windows or Linux runtime release.
- Ego authenticated verification is not equivalent to full Chrome/Safari authentication capability; some OS/browser entitlement-dependent ceremonies may fail even when existing session reuse works.
- Ego Spaces are not a general credential/profile isolation boundary; browser-global CDP/storage operations remain sensitive.
- Task-space lifecycle reclamation remains agent-dependent and unsafe to automate heuristically across unknown concurrent spaces.

## Validation

The authenticated-browser gate was implemented on an isolated branch, validated by repository CI (including `npm test`, site-skill validation, and research-router validation), merged to `dev`, then promoted through the protected `dev -> main` path after both CI and Main PR Source checks passed. No sensitive permission expansion, authenticated write capability, relay, credential handling, destructive behavior, or major architecture change was introduced.

## Highest-value next upgrade

Keep the two integration gates under focused monitoring, but prioritize one additional quality improvement only if upstream provides a reliable scoped signal for either authentication capability or task-space activity/liveness. A first-party scoped capability signal would let the router distinguish `authenticated session available` from `fresh authentication supported` without trial-and-error interaction or sensitive credential inspection.
