# Weekly self-upgrade audit — 2026-08-30

## External gates

- OpenAI: ChatGPT Pro still supports read/fetch MCPs in developer mode; full MCP remains Business and Enterprise/Edu. Secure MCP Tunnel remains the supported path for private/local MCP servers. No evidence found that Plus has gained equivalent private custom MCP developer-mode access.
- Ego Lite: official Windows support remains open/roadmap; Windows host preview remains a proposal. Linux is not a released runtime target.

## Candidate improvements ranked

1. **Concurrent Ego CDP isolation guardrail** — high expected correctness value, low implementation risk, fully reversible, backed by open upstream issue `citrolabs/ego-lite#213`. Selected earlier in this audit.
2. **Prefer bounded first-party/site-specific browser tools over generic DOM extraction when available** — high search/reliability/token-efficiency value, low policy risk, reversible, supported by OpenAI's 2026-08-25 WebMCP practice. Selected as the next low-risk upgrade.
3. **Merge the read-only Ego MCP bridge immediately** — high eventual value but rejected for now because real-machine Ego + Secure MCP Tunnel + ChatGPT end-to-end verification is still missing; merging would overstate production confidence.
4. **Implement our own public/local relay gateway** — rejected because Secure MCP Tunnel already provides the preferred private connectivity path and a custom relay would expand credential/network trust boundaries.
5. **Add browser write tools to the MCP bridge** — rejected because this expands external side effects and belongs in a separately reviewed permission change.
6. **Patch Ego's global CDP transport in this fork** — rejected for now because the root fix belongs in upstream browser/runtime internals and requires real multi-space runtime testing that CI here cannot faithfully provide.
7. **Make structured site tools universally authoritative** — rejected because a structured tool can still be stale, scoped to the wrong account/variant/region, or conflict with a stronger source. Structured interfaces improve extraction, not evidence authority by themselves.
8. **Add more generic source-ranking text** — rejected because recent work already covers authority × specificity × freshness, snippet discipline, variant matching, personal eligibility, safe replacement, and static-vs-live routing; further prose has lower marginal value than executable routing regressions.

## Implemented in this audit

Added a seventh standing research-router regression: when concurrent task spaces would use raw CDP/global target switching, do not assume per-space isolation. Prefer task-space high-level helpers; if raw CDP is unavoidable, serialize the critical section and re-verify task-space/page identity before trusting the result.

A dedicated reference policy and executable validation checks accompany the concurrency regression so the guardrail cannot silently disappear in later upgrades.

Added an eighth standing regression for live pages that expose a bounded first-party or site-specific structured interface, including browser-side site tools such as WebMCP. When that interface provides equivalent or better freshness and scope, prefer it before generic DOM selectors or large semantic snapshots. Keep DOM/snapshot extraction as fallback or contradiction check, and continue verifying exact account, variant, year, region, cohort, plan, date, and scope.

This improves reliability and token efficiency without expanding browser permissions or external write capability.

## Current capability gaps

- No real-machine end-to-end proof yet for `ego-chatgpt-mcp` through Secure MCP Tunnel into ChatGPT developer mode.
- The Draft MCP bridge still needs a fail-closed browser-level private-network boundary covering resolved destinations and redirect hops before it is mergeable.
- Ego Lite still lacks released Windows/Linux runtime support.
- Plus private custom MCP access remains unconfirmed/unavailable in current official plan guidance.
- Upstream global CDP/task-space isolation issue remains unresolved.
- Research-router evals are still policy/regression checks rather than full model-executed, scored end-to-end research evaluations.

## Next highest-value upgrade

Finish the fail-closed private-network/redirect boundary for the Draft Ego MCP bridge without weakening its SSRF counterexample tests, then run a real Ego + Secure MCP Tunnel + ChatGPT developer-mode end-to-end verification. In parallel, the next research-only quality step is a small scored end-to-end eval harness around deterministic fixtures or recorded evidence packs, without introducing model credentials into repository CI.
