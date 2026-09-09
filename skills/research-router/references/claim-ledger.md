# BruceAI Claim Ledger v0.2

The Claim Ledger is the smallest shared state for BruceAI research, challenge, strategy, innovation, and execution handoff.

Use it only when a task has multiple material claims, multiple stages, or multiple specialists. For simple work, skip it.

## Five fields

| Field | Meaning |
|---|---|
| **Claim** | One decision-relevant statement. Include material scope inline when needed: account, plan, region, variant, year, date, cohort, or jurisdiction. |
| **Evidence** | The best supporting or contradicting source/tool pointer. Keep it short and de-duplicate the same underlying source. |
| **Status** | `Confirmed`, `High probability`, `Needs verification`, or `Conflicted`. |
| **Impact** | `High`, `Medium`, or `Low`: how much this claim could change the decision. |
| **Next action** | The single next useful step: `none`, `verify`, `challenge`, `research`, `decide`, or a bounded execution proposal. |

## Materiality-first claim decomposition

Build the Ledger from the decision backward, not from every fact that could be researched.

1. **Start with the decision boundary.** Ask what conclusion, recommendation, eligibility result, or action could change. Create claims only for facts or hypotheses whose truth can materially move that boundary.
2. **Make each claim independently falsifiable.** A claim should be specific enough that evidence can support or contradict it without silently bundling several different propositions. Split a compound claim when its parts could have different evidence, status, scope, or decision impact.
3. **Do not manufacture independence.** If several subclaims are merely restatements of the same premise or depend on the same underlying evidence lineage, do not count them as separate confirmation. Keep the shared premise explicit.
4. **Separate reasoning types.** Observed fact, inference, causal explanation, estimate, and recommendation must remain distinct claims when they are material. Evidence for correlation does not by itself confirm causation; evidence for a fact does not automatically validate a recommendation.
5. **Prioritize high-impact uncertainty.** Research high-impact `Needs verification` or `Conflicted` claims before low-impact confirmed details. A low-impact unknown should not consume research budget merely because it is easy to search.
6. **Challenge the first decomposition.** For a consequential causal, strategic, or diagnostic conclusion, add or identify at least one plausible rival explanation, exception, or disconfirming claim before treating the initial frame as sufficient.
7. **Stop decomposing when detail stops changing the decision.** Do not create child claims that would share the same evidence, preserve the same status, and leave the same action unchanged. Prefer one bounded claim over an exhaustive taxonomy.

A useful test is: **if this claim flipped from true to false, could the decision or next verification step change?** If not, it probably does not belong in the active Ledger.

## Minimal example

| Claim | Evidence | Status | Impact | Next action |
|---|---|---|---|---|
| Plus account X has private custom MCP access as of 2026-09-06 | authenticated settings page + current official plan docs | Needs verification | High | verify |
| ego-lite v1.2.3 is macOS-only | upstream release + README | Confirmed | High | none |
| Supply weakness is the main cause of JP traffic decline | supply metrics support it; demand/seasonality not yet excluded | High probability | High | challenge |

## Update rules

- Update the existing row when evidence changes; do not create a second narrative version of the same claim.
- Scope travels with the claim. Do not silently generalize evidence from one account, plan, region, year, or variant.
- Stronger evidence may change `Status`; downstream reasoning alone may not.
- If evidence conflicts, keep `Conflicted` until the conflict gate resolves it or make the decision conditional.
- `Next action` exists to prevent open-ended research. Set it to `none` when more work has no decision value.
- The Ledger is not a transcript, task manager, memory store, or workflow engine.

## Relationship to Evidence Engine v1 and the Evidence Pack

For consequential, contested, authenticated, browser-dependent, or multi-source work, the canonical claim state is the Evidence Envelope defined in `skills/research-router/references/evidence-envelope.schema.json`.

The Claim Ledger is a compact human/agent projection of that state: **Claim → Evidence → Status → Impact → Next action**. It intentionally omits detailed provenance, lineage, confidence rationale, and conflict structure so collaboration stays lightweight. Do not let a shorter Ledger row erase uncertainty or scope that exists in the underlying envelope.

The Evidence Pack is the research handoff contract. The Claim Ledger is its compact working table when shared state is useful.

Do not duplicate the same information in multiple narrative forms. For multi-claim work, the Evidence Pack can point to the Ledger and the underlying envelopes, then add only the question/scope, material conflict context, and final synthesis needed downstream.