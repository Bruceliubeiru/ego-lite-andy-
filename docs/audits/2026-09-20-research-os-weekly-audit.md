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

### Required falsification before implementation

Add a semantic fixture proving `covered A + material read B -> one-shot reopen A`, plus negative cases for forged target, replay of the same receipt, failed reopened acquisition, wrong/non-monotonic revision, and an unrelated B delta that must not reopen A. Run the standing research-router, Evidence Engine, Evidence Envelope semantic, browser-auth, runtime-reliability, collaboration, trajectory/metamorphic, decision-delta, and coverage-canonicalization gates.

### Why no code patch in this audit

The current automation execution surface can inspect and write GitHub but does not expose a local repository test runner. The owner policy requires targeted internal/local regression validation before a low-risk auto-merge. An unvalidated patch would trade a known modeling gap for unknown regressions and would violate the no-activity-for-activity rule. This audit therefore records the counterexample and exact acceptance tests as the next critical path.

## Compatibility cross-check

- OpenAI's current official guidance still says full MCP is limited to Business and Enterprise/Edu, while Pro can connect read/fetch MCPs in developer mode. Local/private MCP servers connect through Secure MCP Tunnel rather than direct local connection. The Plus compatibility signal has not fired.
- `citrolabs/ego-lite` still states macOS is available today, Windows is closed beta/coming soon, and Linux is on the roadmap. The Windows/Linux runtime compatibility signal has not fired.

## Rejected ideas

- Add a fourth collaboration gate for reopening: rejected. The failure is representable inside Evidence Engine/control-state semantics.
- Time-based or retry-count reopening: rejected. It does not prove decision relevance and can reintroduce research loops.
- Treat repeated summaries/mirrors as sufficient trigger evidence: rejected. Same-lineage repetition is not independent evidence.
- Patch and merge without executing the standing veto tests: rejected under the current owner policy.

## Current capability gap / next critical path

Obtain a repository execution surface for targeted local/internal tests, then implement and falsify explicit cross-surface reopen targeting. If all standing veto tests pass, the change is low-risk, reversible, read-only control logic and can follow the normal validated merge path.