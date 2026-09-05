# BruceAI A/B evolution contract

BruceAI keeps the user-facing model intentionally simple. Internal experimentation, branch topology, evidence plumbing, and candidate lifecycle are implementation details unless they materially affect the decision.

## User-facing modes

Expose only two practical modes:

- **`BruceAI: <task>`** — use the current validated baseline and automatically invoke only the internal capabilities that materially improve the task.
- **`BruceAI A/B: <task>`** — compare the current validated baseline (A) with one isolated candidate path (B) on the same real task, then report the meaningful delta and an evolution verdict.

Do not require the user to manage Stable/Lab/Shared/Candidate modes, routing trees, Evidence Packs, or tool-selection details.

## A/B comparison

For `BruceAI A/B`, define:

- **A — baseline**: the current validated default behavior.
- **B — candidate**: one coherent new capability or changed workflow under test. Keep it isolated from A until promoted.

Keep the task definition, scope, decision date, success criteria, and safety constraints aligned between A and B. When B intentionally has a new evidence source or tool that A lacks, treat that access difference as part of the candidate and state it in the comparison rather than pretending the experiment isolates reasoning quality alone.

Compare only dimensions that matter to the user's outcome:

1. **Correctness and evidence quality** — fewer factual errors, stronger source discipline, better scope matching.
2. **Completeness** — fewer material omissions without adding low-value noise.
3. **Counterexamples and risk detection** — better challenge of the first plausible answer and better recognition of uncertainty.
4. **Actionability** — better decisions, prioritization, next actions, or execution design.
5. **Cost** — extra latency, search/tool calls, and token/context overhead are justified by the gain.

**Safety and regression behavior are veto gates, not tradeable score components.** A candidate that weakens evidence discipline, permission boundaries, authenticated-state safety, or the standing regression cases cannot be promoted even if its answer looks more impressive.

## Output discipline

Do not dump two full reports by default. Return the best usable answer plus a compact comparison:

- what B discovered or improved;
- what B made worse or more expensive;
- whether the final decision changed;
- verdict: **A wins / B wins — promote / Mixed — keep testing**.

If A and B are effectively equivalent, keep A and avoid complexity for its own sake.

## Promotion rule

Promote B into the default baseline only when it shows a material real-task improvement and passes all standing quality/safety gates. After promotion, B becomes the new A for future experiments.

A/B is therefore an evolution mechanism, not a permanent proliferation of modes:

`A (current) -> test B -> promote only if better -> B becomes new A -> test next candidate`.

If evidence is mixed, task-specific, or too sparse to justify a global upgrade, keep the candidate isolated or restrict the improvement to the task class where it was proven.
