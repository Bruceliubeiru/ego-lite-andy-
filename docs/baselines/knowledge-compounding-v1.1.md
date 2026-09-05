# BruceAI Knowledge Compounding v1.1

Date: 2026-09-05
Status: Stage baseline

## North star

BruceAI should not optimize for a larger knowledge base. It should optimize for a growing set of high-quality, reusable judgments that have survived real use.

The target loop is:

`Conversation -> Capture -> Reuse -> Validate -> Revise -> Reuse again`

This extends the earlier shareable-method baseline from one-time extraction into a living knowledge compounding system.

## Four capabilities to add

### 1. Detect what is worth capturing

Do not archive every good-looking answer. Detect only material reusable value, such as:

- a recurring decision pattern;
- an insight that changed a real decision;
- a reusable workflow or checklist;
- a failure that exposes a durable guardrail;
- a method that transfers across cases;
- an A/B-proven improvement.

When a conversation produces one of these, surface a compact suggestion to capture it. Avoid interrupting routine work or creating knowledge-base noise.

### 2. Track reuse and outcomes

A method is not valuable merely because it was documented. Track whether it continues to work when reused.

For each reusable asset, preserve where practical:

- where it was reused;
- whether it changed the decision or action;
- whether it reduced effort or ambiguity;
- whether it failed or produced a counterexample;
- whether its scope or wording should change.

A useful lifecycle is:

`Candidate -> Reused -> Validated / Revised -> Verified`

If evidence is narrow, keep the asset task-class-specific instead of generalizing globally.

### 3. Expire, downgrade, and deprecate stale knowledge

Knowledge can become wrong even when it was once correct.

Important assets should therefore carry, where relevant:

- applicable conditions;
- version or context scope;
- last validation date;
- known counterexamples;
- status such as Candidate, Verified, Deprecated, or Superseded.

When a newer method replaces an older one, preserve lineage rather than silently overwriting history:

`Baseline v1 -> Deprecated -> Baseline v2`

This makes epistemic change visible and prevents stale rules from quietly contaminating new decisions.

### 4. Add a Shareable Verified publishing gate

A private insight is not automatically a shareable asset.

Before something is published or shared broadly, verify at least:

- personal and company-sensitive details are removed;
- a reader without the original context can understand it;
- inputs, outputs, and intended use are clear;
- applicability and failure boundaries are explicit;
- at least one meaningful counterexample or exception is documented;
- there is at least one practical example, test case, or evaluation path.

Only then should it be treated as **Shareable Verified**.

## Storage architecture: Git first, Docs second

Use a two-layer storage model instead of choosing a single tool for every purpose.

### Canonical system of record: private Git

For the long-term BruceAI knowledge base, use a **private Git repository** as the canonical source of truth.

Why Git is the stronger system-of-record layer:

- deterministic version history and diffs;
- explicit promotion, rollback, deprecation, and lineage;
- machine-readable Markdown / JSON / YAML;
- easy connection to Skills, Playbooks, evals, and automation;
- supports branch / PR review before baseline promotion;
- works naturally with A/B evolution and regression gates;
- future agents can search and manipulate structured assets reliably.

Recommended private structure:

```text
knowledge/
  cases/
  principles/
  playbooks/
  skills/
  evals/
  counterexamples/
  candidates/
  baselines/
  index/
```

Do not put private user capability state, confidential business data, or internal company material into a public repository.

### Human reading and distribution layer: Google Docs / Drive

Use Google Docs for:

- long-form reading;
- comments and collaboration;
- management / team consumption;
- workshop material;
- polished reports;
- selective external sharing.

Google Docs is a strong publishing and collaboration surface, but should not be the only system of record for evolving AI knowledge because version comparison, schema discipline, automated validation, and programmatic reuse are weaker than Git.

### Recommended flow

`Private raw/structured knowledge in Git -> validated shareable asset -> publish selected human-readable version to Google Docs`

Google Docs should therefore be treated as a **view / collaboration / publishing layer**, not the canonical knowledge engine.

## Public vs private boundary

The current `ego-lite-andy-` repository is suitable only for generic, shareable architecture and method standards. Private Bruce knowledge, personal capability state, and confidential business cases should live in a separate private knowledge repository or another private data source.

Keep two conceptual stores:

- **Bruce Private Knowledge** — personal capability model, real private cases, business context, unresolved hypotheses, internal lessons.
- **BruceAI Shareable Knowledge** — anonymous, generalized, validated methods, playbooks, skills, counterexamples, and evals.

Assets may move from Private to Shareable only after deliberate abstraction and privacy review.

## Default governance

1. Capture selectively; do not archive everything.
2. New methods begin as Candidate.
3. Reuse creates evidence.
4. Counterexamples can revise or downgrade an asset.
5. A/B or repeated successful use can promote it.
6. Stale or contradicted assets become Deprecated or Superseded rather than silently disappearing.
7. Only generalized, privacy-safe, tested assets become Shareable Verified.

## Practical user interface

The user should not need to manage storage mechanics.

A single invocation is enough:

`BruceAI沉淀：把这次有价值的东西抽象成通用、可验证、可分享的方法。`

BruceAI should then decide whether the artifact belongs in a private case store, candidate method, verified playbook, skill, eval, or shareable publication layer.

## Stage conclusion

The knowledge system should evolve from:

`save good answers`

into:

`identify reusable judgment -> preserve structure -> reuse -> observe outcomes -> revise -> verify -> publish selectively`.

The measure of success is not how much knowledge is stored. It is how much **validated judgment can be reused without losing quality**.
