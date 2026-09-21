# Research OS weekly audit — 2026-09-20

## Highest-value finding: cross-surface material reopening

The current replay-safe reopen control is strong against repeated receipts but under-models a valid Evidence Engine trajectory. `materialTransitionKey()` requires the receipt coverage surface to equal the producing action coverage surface, and `deriveMaterialReopenAuthorizations()` authorizes that same surface.

A common valid trajectory is different:

1. Surface A is read and marked covered.
2. A later bounded read of independent surface B changes the material claim state/scope and advances the Evidence Engine revision by one.
3. That new evidence makes re-reading A decision-relevant.
4. The current contract cannot faithfully express `B observation -> reopen A` without relabeling the producing observation as if it came from A, weakening provenance integrity.

### Preferred consolidation

Do not add a hard gate. Keep Evidence Engine v1 and the existing Evidence / Conflict / Execution veto boundaries. Extend the replay-safe transition representation so a material receipt can distinguish the producing/source coverage surface from an explicit reopen target surface, with authorization still bound to a canonical target and a monotonic one-step revision.

The target must fail closed when absent, blank, malformed, unrelated to the realized delta, or otherwise unsupported. Coverage keys remain semantic control metadata and must not contain account IDs, profile names, session identifiers, tokens, cookies, opaque user identifiers, or unrelated browsing state. Acquisition failure remains non-negative evidence and must not consume authorization.

### Design refinement after adversarial challenge

A receipt-local `reopen_coverage_key` alone is insufficient. It would let post-hoc evidence metadata nominate an arbitrary covered surface after the observation, so a real delta on B could forge authority to reopen unrelated A.

Ex-ante action-local declaration is also insufficient as the final trust boundary. A buggy or over-eager candidate generator could predeclare arbitrary `reopen_coverage_keys` before execution and thereby manufacture the same authority one step earlier. Moving an assertion from the receipt to the action prevents post-hoc mutation but does not make the dependency independently justified.

Prefer **state-owned dependency binding**: before executing the producing read, the current Research OS state contains a compact canonical dependency relation describing which already-covered surfaces are materially downstream of the producing surface / expected delta. The candidate action may reference that relation, but it must not create or widen it. A completed material receipt can authorize only a target that (a) was already present in the state-owned dependency relation before execution, (b) is compatible with the action's expected delta, and (c) became decision-relevant through an actually realized Evidence Engine delta.

The transition identity should bind producer, target, dependency/research-state revision, and the one-step Evidence Engine revision (conceptually `source=>target@dependency-rev:evidence-r->r+1`). This prevents producer collision, replay, and use of a dependency relation introduced after the observation. Same-surface reopening remains the degenerate `A=>A` case and can be represented explicitly without broad wildcard dependencies.

This relation is control state, not evidence provenance. It should stay small, semantic, privacy-safe, run/freshness-window scoped, and derived from already-classified research dependencies rather than page content similarity. Do not persist user/account/session identifiers in it. Do not infer a dependency merely because two sources contain matching text.

Fail closed when the producer coverage key is absent, target is not present in the pre-observation state-owned dependency relation, dependency revision does not match, target/source keys are blank after canonicalization, Evidence Engine revision is missing/non-monotonic, acquisition did not complete, material state was not observed, or the expected decision delta was not actually realized. A failed reopened acquisition still does not consume the authorization.

### Required falsification before implementation

Add semantic fixtures proving:
- `covered A + state-owned B -> A dependency + realized material read B -> one-shot reopen A`;
- post-hoc/forged target A not present in state before B is rejected;
- action-local predeclaration of A without a matching state-owned dependency is rejected;
- dependency relation added or widened only after B executes is rejected by revision binding;
- a valid dependency without a realized decision delta is rejected;
- replay of the same `B=>A` transition is rejected after successful A re-observation;
- failed reopened acquisition does not consume `B=>A`;
- wrong/non-monotonic Evidence Engine revision is rejected;
- two different producers targeting A do not collide;
- same-surface `A=>A` behavior remains backward-compatible;
- unrelated B evidence cannot reopen A merely because content happens to match;
- stale dependency state from another run/freshness window cannot authorize reopening.

Then run the standing research-router, Evidence Engine, Evidence Envelope semantic, browser-auth, runtime-reliability, collaboration, trajectory/metamorphic, decision-delta, and coverage-canonicalization gates.

### Why no code patch in this audit

The current automation execution surface can inspect and write GitHub but does not expose a usable repository test runner: the local container cannot resolve GitHub, while the GitHub connector does not execute repository code. The owner policy requires targeted internal/local regression validation before a low-risk auto-merge. An unvalidated patch would trade a known modeling gap for unknown regressions and would violate the no-activity-for-activity rule. This audit therefore records the counterexample, hardened design, and exact acceptance tests as the next critical path.

## Compatibility cross-check

- OpenAI's current official guidance still says full MCP is limited to Business and Enterprise/Edu, while Pro can connect read/fetch MCPs in developer mode. Local/private MCP servers connect through Secure MCP Tunnel rather than direct local connection. The Plus compatibility signal has not fired.
- `citrolabs/ego-lite` still has no official Windows/Linux general runtime release; Windows support remains an open upstream request and Linux is not a released supported runtime. The Windows/Linux compatibility signal has not fired.

## Rejected ideas

- Add a fourth collaboration gate for reopening: rejected. The failure is representable inside Evidence Engine/control-state semantics.
- Receipt-only target nomination: rejected because it permits post-hoc arbitrary target authorization.
- Action-only ex-ante target nomination: rejected as the final trust boundary because a candidate generator can predeclare an arbitrary target without independent dependency state.
- Wildcard dependency targets: rejected because they collapse bounded reopening into broad planner authority.
- Time-based or retry-count reopening: rejected. It does not prove decision relevance and can reintroduce research loops.
- Treat repeated summaries/mirrors as sufficient trigger evidence: rejected. Same-lineage repetition is not independent evidence.
- Patch and merge without executing the standing veto tests: rejected under the current owner policy.

## Current capability gap / next critical path

Obtain a repository execution surface for targeted local/internal tests, then implement and falsify state-owned, revision-bound cross-surface reopen targeting. If all standing veto tests pass, the change is low-risk, reversible, read-only control logic and can follow the normal validated merge path.