# BruceAI Claim Ledger v0.5

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

## Verification planning: choose the next highest-value read

After decomposition, do not verify claims in row order and do not equate `High impact` with `verify next`. Choose the next research action by expected decision value.

Evaluate candidate verification actions qualitatively on these dimensions:

1. **Decision sensitivity** — if this claim or conflict resolved the other way, could the current decision, recommendation, or execution path change materially?
2. **Uncertainty reduction** — is the action capable of moving the claim from `Needs verification` / `Conflicted` toward a meaningfully more certain state, rather than merely adding another summary?
3. **Evidence independence and specificity** — does it add a new relevant evidence lineage or a materially more specific/fresh/authoritative observation, rather than repeating the same underlying source?
4. **Acquisition cost** — prefer bounded first-party reads, existing authenticated state, structured site tools, or other low-token/low-latency checks when they can resolve the same material uncertainty.
5. **Safety and reversibility** — read-only verification outranks mutation. Do not perform authenticated writes, destructive actions, permission expansion, credential handling, or state changes merely to reduce uncertainty.
6. **Downstream leverage** — prefer a verification that can resolve multiple dependent claims or eliminate a major rival explanation without falsely counting one lineage as several confirmations.

Do not invent numeric probabilities, information-gain scores, or fake precision when the inputs are qualitative. A useful ordering is: **decision-changing + unresolved + independent/specific + cheap/safe** before **interesting + easy + redundant**.

Before executing the selected action, challenge it once: identify the strongest reason it might be low-value or misleading. Common counterexamples include duplicate lineage, wrong account/region/variant, an observation surface too narrow to prove absence, a result that cannot change the decision, or a cheaper authoritative read that dominates it.

## Conflict reasoning: diagnose before collecting more evidence

`Conflicted` is not itself a diagnosis. Before widening research, identify the smallest plausible conflict dimension that can explain why apparently opposing evidence differs.

Check these dimensions first:

1. **Scope** — account, plan, region, cohort, variant, jurisdiction, inventory class, or other population boundary differs.
2. **Time / freshness** — the evidence describes different policy dates, release versions, booking windows, market periods, or observed states.
3. **Definition / denominator** — the sources use the same word for different metrics, eligibility rules, populations, units, or calculation methods.
4. **Provenance / observation surface** — one result comes from the wrong page, account, frame, document, session, profile, cached state, partial listing, or non-exhaustive visibility surface.
5. **Method / causal model** — two analyses observe compatible facts but attribute them to different mechanisms or use different estimation methods.
6. **Authority** — the sources genuinely assert incompatible rules at the same material scope and time, and neither can be explained away by a narrower provenance or definition mismatch.

Do not call two pieces of evidence contradictory until their material scope and definitions overlap. A generic rule and an exact-account exception may both be true. A monthly metric and a daily run-rate may both be true. A policy page and a stale cached snippet may not deserve equal conflict weight.

When a likely conflict dimension is identified, choose the **smallest discriminating verification** that could resolve it. Examples: verify the exact account rather than search more generic policy pages; confirm the metric denominator rather than find a third dashboard; check the effective date rather than average old and new documentation; enumerate the bounded population rather than infer absence from a partial view.

If several conflict dimensions remain plausible, preserve the claim as `Conflicted` and rank the next verification by the same decision-value rules above. Do not resolve a conflict by majority vote, repeated summaries from one lineage, or silently preferring the source that matches the first hypothesis.

For causal conflicts, compare rival explanations against discriminating predictions. Prefer evidence that would differ under the competing explanations rather than evidence that both explanations already predict. If no safe bounded read can discriminate them and the distinction does not change the decision, stop and preserve the causal uncertainty instead of over-researching.

## Research control loop: observe, update, then re-plan

The verification plan is deliberately **one material step deep**. A useful next action is not a license to execute a precomputed chain of later actions after the evidence state has changed.

1. **Select one highest-value verification action.** It may contain a bounded set of reads only when they are jointly required to answer the same immediate question and their order does not depend on intermediate results.
2. **Execute and observe the result.** Record acquisition failures as limitations, not negative evidence. Preserve scope, lineage, provenance, and material conflicts.
3. **Update the affected claim state before doing more research.** Re-evaluate `Status`, `Impact`, conflict diagnosis, confidence, and `Next action` using the new evidence. Do not leave later actions anchored to a stale pre-verification ledger.
4. **Recompute the next action from the updated state.** A result may confirm the decision, create a new conflict, eliminate a rival explanation, make another claim decision-sensitive, or make all remaining research low-value.
5. **Stop immediately when the stopping rule is met.** Do not finish a queued research batch merely because it was planned before the last observation.

Do not serialize independent bounded reads unnecessarily. Parallel reads are acceptable when none depends on another's result, all are safe/read-only, and each remains useful under every plausible outcome of the others. When an intermediate result can change whether a later read is needed, its scope, or which source should be consulted, re-plan before continuing.

This loop is a control discipline, not a new hard collaboration gate. Evidence, Conflict, and Execution remain the only hard gates.

### Stopping rule

Set `Next action` to `none` and stop researching when all remaining unresolved claims satisfy at least one of these conditions:

- resolving them cannot materially change the current decision or recommendation;
- the best available action would only repeat the same evidence lineage without improving scope, freshness, authority, or provenance;
- the remaining uncertainty can only be reduced through a risky/state-changing action that the user has not explicitly delegated;
- the acquisition cost is disproportionate to the decision impact and the current evidence is already sufficient for a bounded conclusion.

Stopping is not the same as claiming certainty. Preserve residual uncertainty in the Evidence Envelope / Evidence Pack and make the decision conditional when necessary.

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
- If evidence conflicts, diagnose the conflict dimension first; keep `Conflicted` until the conflict gate resolves it or make the decision conditional.
- Re-plan after each material verification result; do not execute stale queued actions whose value depended on the old evidence state.
- `Next action` exists to prevent open-ended research. Set it to `none` when more work has no decision value.
- The Ledger is not a transcript, task manager, memory store, or workflow engine.

## Relationship to Evidence Engine v1 and the Evidence Pack

For consequential, contested, authenticated, browser-dependent, or multi-source work, the canonical claim state is the Evidence Envelope defined in `skills/research-router/references/evidence-envelope.schema.json`.

The Claim Ledger is a compact human/agent projection of that state: **Claim → Evidence → Status → Impact → Next action**. It intentionally omits detailed provenance, lineage, confidence rationale, and conflict structure so collaboration stays lightweight. Do not let a shorter Ledger row erase uncertainty or scope that exists in the underlying envelope.

The Evidence Pack is the research handoff contract. The Claim Ledger is its compact working table when shared state is useful.

Do not duplicate the same information in multiple narrative forms. For multi-claim work, the Evidence Pack can point to the Ledger and the underlying envelopes, then add only the question/scope, material conflict context, and final synthesis needed downstream.
