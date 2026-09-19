# Research Stack Weekly Audit — 2026-09-13

## Scope

Sunday deep audit of the BruceAI Research OS centered on `Bruceliubeiru/ego-lite-andy-`, covering the Evidence Engine v1 consolidation layer, the three hard collaboration gates (Evidence, Conflict, Execution), browser-auth/runtime reliability fixtures, current OpenAI Apps SDK/MCP/Developer Mode/Secure MCP Tunnel guidance, ego-lite upstream/runtime changes, and the previous week's observed failure modes.

## Integration gates

1. **ChatGPT Plus private custom MCP / Secure MCP Tunnel gate: closed/unconfirmed.** Current first-party OpenAI guidance still documents Pro read/fetch MCP access in developer mode and full MCP for Business/Enterprise/Edu. It also states that local/private MCP servers are not connected directly and use Secure MCP Tunnel in supported OpenAI products. No current first-party evidence establishes Plus parity with the monitored Pro capability.
2. **ego-lite Windows/Linux runtime gate: closed.** Official upstream documentation still describes macOS as the current runtime platform and Windows/Linux as roadmap work; no official Windows or Linux runtime release was found.

## Weekly change review

The strongest change this week was not a new gate but continued consolidation into Evidence Engine v1:

- exact target/window/page provenance for wrong-target browser behavior;
- acquisition locator vs artifact byte identity;
- installed vs resolved vs executed Skill/API contract;
- source object kind and lifecycle provenance;
- failing-test observation vs causal regression attribution;
- migration leftovers silently shadowing the intended Skill version.

These changes remain representable inside the existing Evidence / Conflict / Execution boundaries. No demonstrated failure requires a fourth hard collaboration gate.

## Fresh upstream observations

### ego-lite issue #69: persistent GPU/resource cost

The issue remains open and received a fresh 2026-09-12 report that the problem is still present. Earlier instrumented reports in the same issue show materially elevated GPU activity across multiple ego-lite versions, including a fresh temporary profile, while maintainers separately documented higher resource use for Space Overview / Agent Task Space modes.

Interpretation: this is credible evidence that rendered-browser use can have non-trivial resource cost even outside large batch jobs, but the reports do not establish that every current build or environment has the same cost. The existing runtime rules already prefer native search/fetch/connectors when rendered browsing is unnecessary and already bound resource behavior to exact runtime/host observations. Adding a new idle-GPU gate would duplicate those semantics.

### ego-lite PR #172: historical API guidance became obsolete

PR #172 was closed as obsolete on 2026-09-12 because the v2.0.0 Skill rewrite changed the relevant API contract. This is a concrete reminder that a historically correct PR/body can become invalid evidence for the current API generation.

Interpretation: no new temporal-provenance rule is required. `stale-state-vs-newer-material-evidence`, source-object lifecycle provenance, and exact installed/effective runtime binding already cover the failure mode.

## Current OpenAI cross-check

Current first-party OpenAI guidance confirms:

- full MCP including write/modify remains limited to Business and Enterprise/Edu;
- Pro can connect read/fetch MCPs in developer mode;
- local/private MCP servers are not connected directly and use Secure MCP Tunnel in supported products;
- custom-app tool definitions are not automatically refreshed after approval; workspaces can retain a frozen approved snapshot until refreshed;
- search/fetch tool names are no longer mandatory for connected servers.

The frozen-contract behavior is already represented by the Research OS effective approved/resolved contract provenance rule, so no duplicate OpenAI-specific gate is warranted.

## Ranked candidate improvements

| Candidate | Expected value | Safety | Maintainability | Reversibility | Decision |
|---|---:|---:|---:|---:|---|
| Add a new idle-GPU/resource gate from ego-lite #69 | Medium | High | Low-Medium | High | Reject: duplicates existing resource-budget and proof-need semantics; current-version universality is unproven. |
| Add a historical-PR-obsolescence gate from PR #172 | Low-Medium | High | Low | High | Reject: already covered by temporal provenance + exact runtime contract. |
| Add a fourth collaboration veto for runtime provenance | Low | Medium | Low | Medium | Reject: all observed failures remain safely representable by Evidence/Conflict/Execution. |
| Remove broad provenance checks to reduce rule count | Negative | Low | Medium | Medium | Reject: recent failures show those checks are still active, discriminating veto tests rather than dead duplication. |
| Keep architecture stable and record the audit / rejected candidates | High | High | High | High | Accept: preserves the learn loop without rule inflation or permission growth. |

## Rejected ideas

1. **Auto-disable GPU/hardware acceleration as a performance workaround.** Rejected. Prior upstream evidence shows browser-global graphics settings can cause crash loops or materially different resource behavior depending on exact app build. This remains behind the Execution boundary and exact-runtime verification.
2. **Treat the latest upstream Skill documentation as proof of the installed/effective API.** Rejected. This week's stale-copy migration failure and the obsolete PR #172 both show that documentation/release state can diverge from the actually resolved host contract.
3. **Add another provenance-specific hard gate.** Rejected. The existing Evidence Engine model already carries scope, lineage, provenance, conflict, confidence, decision impact, and next action; adding another veto would increase rule count without a distinct safety boundary.
4. **Use community Windows/Linux work as compatibility-trigger evidence.** Rejected. The monitor is explicitly for official runtime support, not community ports, open work, or platform-neutral Skill code.
5. **Use public/local relay exposure to compensate for ChatGPT plan entitlement.** Rejected. That changes the security boundary and is outside the allowed auto-merge scope.

## Current capability gaps

- No confirmed ChatGPT Plus parity with the monitored Pro private custom MCP read/fetch / Secure MCP Tunnel path.
- No official ego-lite Windows or Linux runtime release.
- Browser runtime resource cost is not yet exposed as a stable first-party capability/telemetry contract; exact host/build observations remain necessary.
- Effective Skill/API resolution can still diverge from installation state because of host precedence, stale copies, disabled settings, or frozen snapshots.
- Several browser reliability claims still depend on upstream issue reports rather than a released machine-checkable capability matrix.

## Validation / standing veto status

No behavioral rule, permission, credential handling, browser mutation, relay, authenticated write capability, destructive path, or architecture boundary was changed in this audit. The review explicitly retained exactly three hard collaboration gates. Existing Evidence Engine, browser-auth, runtime-reliability, evidence-envelope, research-router, and collaboration fixtures remain the standing veto set.

## Highest-value next upgrade

Prefer one executable capability-resolution check that can cheaply report the **effective resolved Skill/API generation and browser app build** without reading credentials, cookies, whole profiles, or unrelated filesystem state. That would convert several current provenance rules from documentation discipline into a bounded machine-verifiable preflight and reduce repeated version/precedence ambiguity across research runs.
