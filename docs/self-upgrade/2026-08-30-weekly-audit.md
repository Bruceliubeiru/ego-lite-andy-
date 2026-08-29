# Weekly self-upgrade audit — 2026-08-30

## External gates

- OpenAI: ChatGPT Pro still supports read/fetch MCPs in developer mode; full MCP remains Business and Enterprise/Edu. Secure MCP Tunnel remains the supported path for private/local MCP servers. No evidence found that Plus has gained equivalent private custom MCP developer-mode access.
- Ego Lite: official Windows support remains open/roadmap; Windows host preview remains a proposal. Linux is not a released runtime target.

## Candidate improvements ranked

1. **Concurrent Ego CDP isolation guardrail** — high expected correctness value, low implementation risk, fully reversible, backed by open upstream issue `citrolabs/ego-lite#213`. Selected.
2. **Merge the read-only Ego MCP bridge immediately** — high eventual value but rejected for now because real-machine Ego + Secure MCP Tunnel + ChatGPT end-to-end verification is still missing; merging would overstate production confidence.
3. **Implement our own public/local relay gateway** — rejected because Secure MCP Tunnel already provides the preferred private connectivity path and a custom relay would expand credential/network trust boundaries.
4. **Add browser write tools to the MCP bridge** — rejected because this expands external side effects and belongs in a separately reviewed permission change.
5. **Patch Ego's global CDP transport in this fork** — rejected for now because the root fix belongs in upstream browser/runtime internals and requires real multi-space runtime testing that CI here cannot faithfully provide.
6. **Add more generic source-ranking text** — rejected because recent work already covers authority × specificity × freshness, snippet discipline, variant matching, personal eligibility, safe replacement, and static-vs-live routing; further prose has lower marginal value than an isolation regression.

## Implemented in this audit

Added a seventh standing research-router regression: when concurrent task spaces would use raw CDP/global target switching, do not assume per-space isolation. Prefer task-space high-level helpers; if raw CDP is unavoidable, serialize the critical section and re-verify task-space/page identity before trusting the result.

A dedicated reference policy and executable validation checks accompany the regression case so the guardrail cannot silently disappear in later upgrades.

## Current capability gaps

- No real-machine end-to-end proof yet for `ego-chatgpt-mcp` through Secure MCP Tunnel into ChatGPT developer mode.
- Ego Lite still lacks released Windows/Linux runtime support.
- Plus private custom MCP access remains unconfirmed/unavailable in current official plan guidance.
- Upstream global CDP/task-space isolation issue remains unresolved.
- Research-router evals are still policy/regression checks rather than full model-executed, scored end-to-end research evaluations.

## Next highest-value upgrade

Build a small scored end-to-end research-eval harness around the existing regression scenarios without introducing model credentials into repository CI. First target deterministic fixtures or recorded evidence packs; only add live/model-backed evals when secrets, cost controls, and reproducibility are designed explicitly.
