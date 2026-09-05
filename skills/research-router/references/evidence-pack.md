# Research OS Evidence Pack contract

The research-router is the evidence layer for downstream reasoning skills. When a task depends materially on external facts, build a compact Evidence Pack before handing the task to decision, strategy, innovation, challenge, planning, or other downstream reasoning.

Do not create an Evidence Pack for tasks that do not need external evidence, such as rewriting supplied text, translation, purely creative drafting, simple arithmetic, or other transformations that can be completed from the user's provided context.

## Minimum handoff

An Evidence Pack should contain only the evidence needed to support or challenge the downstream decision:

- **Question and scope** — the exact decision/research question plus material dimensions such as account, plan, region, variant, year, cohort, date, and jurisdiction.
- **Claims** — concise claim units, each tagged `Confirmed`, `High probability`, or `Needs verification`.
- **Evidence pointer** — the source/page/tool result supporting each material claim. Prefer pointers and concise paraphrases over duplicated source text.
- **Authority × specificity × freshness** — enough metadata to explain why one source is stronger for this exact claim.
- **Facts vs inference** — keep observed facts separate from interpretation, estimates, causal claims, and recommendations.
- **Conflicts and counterevidence** — record material contradictions instead of averaging them away.
- **Constraints and unknowns** — include missing authenticated state, eligibility, exact variant mapping, or other blockers that could change the answer.

## Downstream invariants

Downstream skills may reason over the Evidence Pack, but they must not silently upgrade its certainty.

- A `Needs verification` claim must not become a confirmed fact merely because a strategy, innovation, or planning layer wants to use it.
- `High probability` stays probabilistic unless new evidence is gathered.
- Scope must travel with the claim. A fact established for one account, plan, year, region, cohort, or variant must not be generalized without evidence.
- Conflicting evidence must remain visible until resolved by stronger, more specific, or fresher evidence.
- Recommendations should distinguish what is supported by evidence from what is a judgment call.

If downstream reasoning exposes a missing fact that could materially change the decision, route back through research-router rather than inventing the missing premise.

## Challenge pass

For consequential tasks, challenge the first plausible conclusion before final handoff. Look for at least one material counterexample, exception, newer source, account-specific restriction, hidden dependency, or alternative explanation. If the challenge changes the evidence state, update the Evidence Pack before downstream reasoning continues.

## Token discipline

The Evidence Pack is an internal handoff contract, not a transcript. Keep it compact:

- prefer high-leverage claims over source dumps;
- avoid repeating the same evidence in multiple sections;
- preserve citations/source pointers instead of copying long passages;
- include only uncertainty and conflict that can affect the decision.

The final user answer does not need to expose the full Evidence Pack unless doing so improves clarity, auditability, or decision quality.
