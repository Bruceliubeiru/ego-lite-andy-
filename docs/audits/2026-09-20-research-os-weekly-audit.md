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

Prefer **ex-ante target binding**: the producing read action declares a small canonical set of `reopen_coverage_keys` before execution, representing already-classified dependency surfaces that this expected delta could make decision-relevant again. A completed material receipt may authorize only one of those predeclared targets. The transition identity should bind both producer and target plus the one-step Evidence Engine revision (conceptually `source=>target@r->r+1`), so different producers cannot collide on the same target/revision and replay remains one-shot.

This is control metadata, not a provenance claim. The Evidence Engine remains responsible for the realized claim/scope/conflict/provenance delta; the target declaration only constrains which covered surface that delta is allowed to reopen. Same-surface reopening remains supported as the degenerate `A=>A` case.

Fail closed when the producer coverage key is absent, the target was not predeclared, target/source keys are blank after canonicalization, revision is missing/non-monotonic, acquisition did not complete, material state was not observed, or the expected decision delta was not actually realized. A failed reopened acquisition still does not consume the authorization.

### Required falsification before implementation

Add semantic fixtures proving:
- `covered A + predeclared B -> A + realized material read B -> one-shot reopen A`;
- post-hoc/forged target A not declared by B is rejected;
- a declared target without a realized decision delta is rejected;
- replay of the same `B=>A` transition is rejected after successful A re-observation;
- failed reopened acquisition does not consume `B=>A`;
- wrong/non-monotonic revision is rejected;
- two different producers targeting A do not collide;
- same-surface `A=>A` behavior remains backward-compatible;
- unrelated B evidence cannot reopen A merely because content happens to match.

Then run the standing research-router, Evidence Engine, Evidence Envelope semantic, browser-auth, runtime-reliability, collaboration, trajectory/metamorphic, decision-delta, and coverage-canonicalization gates.

### Why no code patch in this audit

The current automation execution surface can inspect and write GitHub but does not expose a usable repository test runner: the local container cannot resolve GitHub, while the GitHub connector does not execute repository code. The owner policy requires targeted internal/local regression validation before a low-risk auto-merge. An unvalidated patch would trade a known modeling gap for unknown regressions and would violate the no-activity-for-activity rule. This audit therefore records the counterexample, hardened design, and exact acceptance tests as the next critical path.

## Compatibility cross-check

- OpenAI's current official guidance still says full MCP is limited to Business and Enterprise/Edu, while Pro can connect read/fetch MCPs in developer mode. Local/private MCP servers connect through Secure MCP Tunnel rather than direct local connection. The Plus compatibility signal has not fired.
- `citrolabs/ego-lite` still states macOS is available today, Windows is closed beta/coming soon, and Linux is on the roadmap. The Windows/Linux runtime compatibility signal has not fired.

## Rejected ideas

- Add a fourth collaboration gate for reopening: rejected. The failure is representable inside Evidence Engine/control-state semantics.
- Receipt-only target nomination: rejected after adversarial challenge because it permits post-hoc arbitrary target authorization.
- Time-based or retry-count reopening: rejected. It does not prove decision relevance and can reintroduce research loops.
- Treat repeated summaries/mirrors as sufficient trigger evidence: rejected. Same-lineage repetition is not independent evidence.
- Patch and merge without executing the standing veto tests: rejected under the current owner policy.

## Current capability gap / next critical path

Obtain a repository execution surface for targeted local/internal tests, then implement and falsify ex-ante-bound cross-surface reopen targeting. If all standing veto tests pass, the change is low-risk, reversible, read-only control logic and can follow the normal validated merge path.