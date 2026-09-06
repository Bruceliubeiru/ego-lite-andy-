# Research OS Evidence Pack contract

The research-router is the evidence layer for downstream reasoning skills. When a task depends materially on external facts, build a compact Evidence Pack before handing the task to decision, strategy, innovation, challenge, planning, or other downstream reasoning.

Do not create an Evidence Pack for tasks that do not need external evidence, such as rewriting supplied text, translation, purely creative drafting, simple arithmetic, or other transformations that can be completed from the user's provided context.

## Minimum handoff

An Evidence Pack should contain only the evidence needed to support or challenge the downstream decision:

- **Question and scope** — the exact decision/research question plus material dimensions such as account, plan, region, variant, year, cohort, date, and jurisdiction.
- **Claims** — concise claim units with stable IDs when more than one specialist is involved, each tagged `Confirmed`, `High probability`, `Needs verification`, or `Conflicted`.
- **Evidence pointer** — the source/page/tool result supporting each material claim. Prefer pointers and concise paraphrases over duplicated source text.
- **Authority × specificity × freshness** — enough metadata to explain why one source is stronger for this exact claim.
- **Facts vs inference** — keep observed facts separate from interpretation, estimates, causal claims, and recommendations.
- **Conflicts and counterevidence** — record material contradictions instead of averaging them away.
- **Constraints and unknowns** — include missing authenticated state, eligibility, exact variant mapping, or other blockers that could change the answer.
- **Decision impact** — for unresolved claims, record whether the uncertainty is capable of changing the recommendation or merely affects detail.

## BruceAI collaboration contract

The Evidence Pack is also the shared state for BruceAI collaboration. Specialists should exchange evidence state, not free-form conclusions.

Use a **manager-first** pattern by default: one orchestrator owns decomposition, shared constraints, final synthesis, and permission gates. Specialists are bounded contributors. A true handoff is appropriate only when one specialist should become the sole active owner of the next phase. Do not create several peer agents that each believe they own the final answer.

### Adaptive collaboration depth

Do not invoke a swarm by default. Escalate only when additional independence or specialization has material expected value:

1. **Direct** — no external evidence is needed, or one bounded lookup can settle the task.
2. **Research** — one research path builds the first Evidence Pack.
3. **Research + challenge** — add an adversarial pass for consequential, contested, costly, fast-moving, or assumption-sensitive work.
4. **Specialist fan-out** — use multiple workers only when the task has genuinely separable evidence domains, such as policy vs authenticated account state, supply vs demand, or technical feasibility vs security.

Parallel workers should have non-overlapping work units or an explicit replication/counterexample purpose. Do not spend tokens asking several agents the same broad question and then treat agreement as corroboration.

### Work-unit handoff

For multi-specialist work, every assignment should be bounded by:

- **Objective** — the exact claim, question, or evidence domain to resolve.
- **Scope** — account, plan, region, variant, year, cohort, date, jurisdiction, and other material boundaries.
- **Known claim state** — relevant claim IDs and their current status.
- **Exclusions** — what this worker should not redo or decide.
- **Stop condition** — what evidence is sufficient, what would falsify the leading hypothesis, or when further search is no longer decision-relevant.

Every return should update the shared Evidence Pack with evidence pointers, claim status, conflicts, unknowns, and a short stop reason. A polished narrative without those fields is not a sufficient handoff for consequential work.

### Roles and authority

- **Orchestrator** — owns task decomposition, assigns bounded work, de-duplicates evidence, maintains the shared claim state, decides when more research has expected value, applies safety/permission gates, and produces the final synthesis.
- **Research specialist** — discovers and verifies evidence for assigned claims. It should not widen scope or execution authority on its own.
- **Challenger** — attacks the leading hypothesis by looking for a material counterexample, exception, newer source, scope mismatch, hidden dependency, or alternative explanation. It is not a second generic researcher.
- **Verifier/adjudicator** — resolves evidence conflicts using authority × specificity × freshness, exact scope, and directness. For ordinary tasks the orchestrator can perform this role; use a distinct verifier when the decision is consequential or the evidence remains contested.
- **Executor** — receives a bounded action proposal only after the evidence gate is satisfied. Research authority does not imply permission to perform external writes or expand privileges.

### Merge rules

- Merge **claims and evidence**, not agent opinions.
- Do not use agent majority vote to resolve factual disagreement.
- Duplicate citations, mirrors, summaries, or multiple agents pointing to the same underlying source count as one evidence lineage, not independent confirmation.
- Preserve `Needs verification`, `High probability`, and `Conflicted` states through every handoff. Certainty may increase only when new evidence justifies it.
- Scope travels with the claim. Never generalize account-, plan-, region-, year-, cohort-, or variant-specific evidence silently.
- If a stronger, more specific, or fresher source contradicts several weaker outputs, adjudicate the evidence rather than averaging the outputs.
- If a conflict cannot be resolved, keep it visible and make the recommendation conditional where the conflict has decision impact.

### Stop and re-route rules

Stop adding agents when one of these is true:

- the decision-relevant claims are adequately verified;
- remaining uncertainty cannot change the action or recommendation;
- new workers would only duplicate existing evidence;
- verification is blocked by an unavailable authenticated state, tool capability, or permission boundary and the limitation is already explicit.

Re-route to research when a downstream layer discovers a missing or stale fact that could materially change the decision. Do not let downstream reasoning invent the missing premise.

### Execution gate

A verified recommendation is not itself authorization to act.

- Read-only research and verification can proceed within the research delegation already granted.
- Low-risk repository improvements may be proposed and validated in an isolated branch when the user has delegated that class of work.
- Permission expansion, authenticated write actions, public/local relay gateways, credential handling, destructive behavior, and major architecture changes remain behind explicit review/approval boundaries.
- When execution is allowed, pass only the minimum verified facts and bounded action required; do not expose unrelated account, cookie, credential, or browser state.

## Downstream invariants

Downstream skills may reason over the Evidence Pack, but they must not silently upgrade its certainty.

- A `Needs verification` claim must not become a confirmed fact merely because a strategy, innovation, or planning layer wants to use it.
- `High probability` stays probabilistic unless new evidence is gathered.
- `Conflicted` stays conflicted until stronger, more specific, or fresher evidence resolves the contradiction.
- Scope must travel with the claim. A fact established for one account, plan, year, region, cohort, or variant must not be generalized without evidence.
- Recommendations should distinguish what is supported by evidence from what is a judgment call.

If downstream reasoning exposes a missing fact that could materially change the decision, route back through research-router rather than inventing the missing premise.

## Challenge pass

For consequential tasks, challenge the first plausible conclusion before final handoff. Look for at least one material counterexample, exception, newer source, account-specific restriction, hidden dependency, or alternative explanation. If the challenge changes the evidence state, update the Evidence Pack before downstream reasoning continues.

The challenger should not repeat the first pass merely to create the appearance of independent work. Its job is to find evidence that could break or materially narrow the current conclusion.

## Token discipline

The Evidence Pack is an internal handoff contract, not a transcript. Keep it compact:

- prefer high-leverage claims over source dumps;
- avoid repeating the same evidence in multiple sections;
- preserve citations/source pointers instead of copying long passages;
- de-duplicate evidence by underlying source lineage;
- keep work units orthogonal unless deliberate replication is needed;
- include only uncertainty and conflict that can affect the decision;
- stop adding specialists when marginal evidence value is low.

The final user answer does not need to expose the full Evidence Pack unless doing so improves clarity, auditability, or decision quality.

## Collaboration regression gate

When changing BruceAI orchestration or handoff behavior, preserve the standing cases in `skills/research-router/evals/cases.json` and also review `skills/research-router/evals/collaboration-cases.json`. The collaboration cases specifically guard against duplicate fan-out, agent-majority reasoning, prose-only handoffs, challenger duplication, stale memory reuse, premature completion, execution-authority creep, and multiple competing final owners.
