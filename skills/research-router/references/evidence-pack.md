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

## Evidence Engine v1 — unified claim envelope

For consequential, contested, authenticated, browser-dependent, or multi-source research, represent each material claim using the **Evidence Envelope** contract in `skills/research-router/references/evidence-envelope.schema.json` before final downstream use.

The envelope is not a new workflow engine and should not be forced onto simple lookups. Its purpose is to give existing Evidence Pack, Claim Ledger, browser/auth gates, reliability gates, and conflict rules one shared claim-level representation.

Each material envelope keeps these concepts together:

- **Claim kind** — distinguish `observed_fact`, `inference`, `causal`, `estimate`, and `recommendation` so downstream reasoning cannot silently turn observation into explanation.
- **Scope** — preserve only the account, plan, region, jurisdiction, variant, year, date, cohort, runtime version, or other dimensions that can materially change the claim.
- **Evidence lineage** — identify the underlying source lineage so several summaries, agents, snippets, mirrors, or tool outputs derived from the same source do not count as independent verification.
- **Evidence quality** — keep authority, specificity, freshness, supporting/contradicting direction, limitations, and source pointer explicit.
- **Provenance** — when it matters, bind evidence to the narrowest verified boundary available: source identity, runtime, task space, profile, account marker, page/document/frame/session, region, authentication state, challenge state, and provider read execution.
- **Conflict state** — material contradictions remain unresolved until evidence actually resolves them; majority vote or polished synthesis does not resolve a factual conflict.
- **Confidence and decision impact** — confidence describes how strongly the current evidence supports the scoped claim; decision impact describes how costly it is to be wrong. Do not use confidence prose to override claim status.
- **Next action** — keep one bounded next useful step so research stops when additional evidence cannot change the decision.

### Provenance discipline

Evidence content and evidence provenance are separate questions. Matching text, URL, payload, screenshot content, or tool output is not enough when the claim depends on the exact account, profile, page, document, frame, session, region, or authenticated state.

Use `verified`, `partial`, `unknown`, or `not_applicable` provenance honestly. Do not invent identifiers that the runtime did not expose. If a missing provenance boundary can materially change the conclusion, keep the claim `Needs verification` or `Conflicted` rather than upgrading it from content alone.

For browser evidence, record only the minimum non-sensitive markers needed to establish the relevant boundary. Do not collect or persist passwords, tokens, cookies, credential-store contents, whole profile state, or unrelated browsing data merely to make provenance look complete.

### Absence and acquisition failures

A failed evidence path is not itself evidence of absence. Automation challenges, profile-import failure, stale execution context, evaluator/script failure, timeout, unsupported authentication, or provider-read failure must be represented as acquisition limitations unless an independent bounded path proves the negative fact.

If a fallback proves a weaker or different fact, record it as degraded/partial rather than pretending it is equivalent to the failed path. If no equivalent safe path exists, keep the claim unresolved or blocked.

### Relationship to current gates

Evidence Engine v1 consolidates existing rules; it does **not** add a fourth hard collaboration gate. The standing browser/auth/reliability cases remain veto conditions, while their outcomes should increasingly be expressed through the same envelope fields: scope, provenance, limitation, conflict, status, confidence, and next action.

Protect the model with `skills/research-router/evals/evidence-engine-cases.json` in addition to the existing standing regression suites.

## Claim Ledger v0.1

When a task has multiple material claims, multiple stages, or multiple specialists, use the compact Claim Ledger in `skills/research-router/references/claim-ledger.md` as the shared working state.

Keep it to five fields: **Claim → Evidence → Status → Impact → Next action**. The Ledger is a compact projection of the underlying Evidence Envelope state, not a second source of truth. Research, challenge, strategy, innovation, and execution handoff should update the same claim state instead of creating parallel narrative versions.

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
- when refreshing a living operational source, consume the latest state-changing updates before finalizing current state, then reconcile them with prior evidence by authority, scope, and freshness rather than assuming either the initial body or newest update wins automatically;
- for external provider verification, keep `configured`, authentication result, and `read-executed` distinct; a valid zero-result provider read still counts as executed, while a skipped/non-executed read does not prove fresh provider state;
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

The final user answer does not need to expose the full Evidence Pack or Evidence Envelope unless doing so improves clarity, auditability, or decision quality.

## Collaboration regression gate

When changing BruceAI collaboration behavior, preserve the three cases in `skills/research-router/evals/collaboration-cases.json`: evidence integrity, conflict resolution, and execution authority. Other orchestration details should remain flexible unless a demonstrated failure mode justifies promoting one into a hard gate.
