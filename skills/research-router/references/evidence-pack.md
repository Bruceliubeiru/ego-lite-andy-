# Research OS Evidence Pack contract

The research-router is the evidence layer for downstream reasoning skills. When a task depends materially on external facts, build a compact Evidence Pack before handing the task to decision, strategy, innovation, challenge, planning, or execution.

Do not create an Evidence Pack for tasks that do not need external evidence, such as rewriting supplied text, translation, purely creative drafting, simple arithmetic, or other transformations that can be completed from the user's provided context.

## Minimum handoff

An Evidence Pack should contain only what can affect the decision:

- **Question and scope** — the exact research/decision question plus material boundaries such as account, plan, region, variant, year, cohort, date, and jurisdiction.
- **Claims** — concise claim units, using stable IDs when more than one specialist is involved, tagged `Confirmed`, `High probability`, `Needs verification`, or `Conflicted`.
- **Evidence pointers** — the source/page/tool result supporting each material claim; prefer pointers and concise paraphrases over source dumps.
- **Authority × specificity × freshness** — enough metadata to explain why one source is stronger for this exact claim.
- **Facts vs inference** — keep observations separate from interpretation, estimates, causal claims, and recommendations.
- **Conflicts and unknowns** — keep material contradictions, missing authenticated state, eligibility gaps, exact variant mapping, or other blockers visible.
- **Decision impact** — mark whether unresolved uncertainty can change the recommendation or only affects detail.

## Claim Ledger v0.1

When a task has multiple material claims, multiple stages, or multiple specialists, use the compact Claim Ledger in `skills/research-router/references/claim-ledger.md` as the shared working state.

Keep it to five fields: **Claim → Evidence → Status → Impact → Next action**. Research, challenge, strategy, innovation, and execution handoff should update the same rows instead of creating parallel narrative state.

For simple work, skip the Ledger. It is a lightweight collaboration aid, not a new workflow engine or hard gate.

## BruceAI collaboration contract

Use one orchestrator by default. It owns decomposition, shared constraints, final synthesis, and permission boundaries. Add specialists only when they cover a genuinely separate evidence domain or when a challenge pass has a realistic chance of changing the decision.

Do not create a swarm by default. Prefer this simple escalation path:

1. **Direct** — no external evidence, or one bounded lookup is enough.
2. **Research** — one research path builds the Evidence Pack.
3. **Research + challenge** — add one adversarial pass for consequential, contested, costly, fast-moving, or assumption-sensitive work.
4. **Specialist fan-out** — only for genuinely separable evidence domains such as policy vs authenticated account state, supply vs demand, or technical feasibility vs security.

For multi-specialist work, assignments should stay small: objective, scope, relevant current claim state, exclusions, and a stop condition. Returns should update shared claims/evidence rather than hand back another full report.

### Three hard collaboration gates

Keep the hard gate surface deliberately small. Most orchestration choices are defaults, not blockers.

#### 1. Evidence gate

Before a material conclusion is used downstream, decision-relevant claims must have adequate scope, status, evidence pointers, and visible unknowns/conflicts.

- Agent memory, conversational repetition, polished prose, duplicate discovery, or several agents citing the same underlying source do not create independent verification.
- Do not declare research complete while an unresolved claim can materially reverse the recommendation. Verify it, keep the recommendation conditional, or state the verification limit.
- Downstream reasoning must not silently upgrade `Needs verification`, `High probability`, or `Conflicted` claims.

#### 2. Conflict gate

Do not resolve factual disagreement by agent majority vote.

- Adjudicate using authority, specificity, freshness, exact scope, and directness of evidence.
- Use a challenger to seek a material counterexample, exception, newer source, scope mismatch, hidden dependency, alternative explanation, or failed assumption — not to produce a second generic report.
- If a material contradiction cannot be resolved, keep it visible and make the recommendation conditional.

#### 3. Execution gate

A verified recommendation is not itself authorization to act.

- Read-only research and verification may proceed within the research delegation already granted.
- Low-risk repository improvements may be proposed, isolated, and validated when the user has delegated that class of work.
- Permission expansion, authenticated write actions, public/local relay gateways, credential handling, destructive behavior, and major architecture changes remain behind the applicable explicit review/approval boundary.
- Pass only the minimum verified facts and bounded action needed for execution.

## Soft orchestration defaults

These improve efficiency but are not separate hard gates:

- keep one final-answer owner unless a deliberate handoff transfers ownership;
- make parallel work orthogonal unless deliberate replication is needed;
- merge claims and evidence, not agent opinions;
- de-duplicate by underlying evidence lineage;
- stop adding specialists when decision-relevant claims are adequately verified, remaining uncertainty cannot change the action, verification is blocked and already explicit, or new workers would only duplicate evidence;
- route back to research when a downstream layer discovers a missing or stale fact that could materially change the decision.

## Downstream invariants

Downstream skills may reason over the Evidence Pack, but they must not silently upgrade its certainty. Scope travels with the claim. A fact established for one account, plan, year, region, cohort, or variant must not be generalized without evidence.

If downstream reasoning exposes a missing fact that could materially change the decision, route back through research-router rather than inventing the missing premise.

## Challenge pass

For consequential tasks, challenge the first plausible conclusion before final handoff. Look for at least one material counterexample, exception, newer source, account-specific restriction, hidden dependency, or alternative explanation. Stop when the challenge can no longer materially change the claim state or decision.

## Token discipline

The Evidence Pack is an internal handoff contract, not a transcript. Keep it compact:

- prefer high-leverage claims over source dumps;
- preserve citations/source pointers instead of copying long passages;
- de-duplicate repeated evidence;
- keep work units orthogonal unless deliberate replication is needed;
- include only uncertainty and conflict that can affect the decision;
- stop when marginal evidence value is low.

The final user answer does not need to expose the full Evidence Pack unless doing so improves clarity, auditability, or decision quality.

## Collaboration regression gate

When changing BruceAI collaboration behavior, preserve the three cases in `skills/research-router/evals/collaboration-cases.json`: evidence integrity, conflict resolution, and execution authority. Other orchestration details should remain flexible unless a demonstrated failure mode justifies promoting one into a hard gate.
