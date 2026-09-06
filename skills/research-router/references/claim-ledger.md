# BruceAI Claim Ledger v0.1

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

## Relationship to the Evidence Pack

The Evidence Pack is the research handoff contract. The Claim Ledger is its compact working table when shared state is useful.

Do not duplicate the same information in both forms. For multi-claim work, the Evidence Pack can point to the Ledger and add only the question/scope, material conflict context, and final synthesis needed downstream.
