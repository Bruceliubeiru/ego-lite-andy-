# BruceAI Knowledge Lifecycle Contract v1

Date: 2026-09-05
Purpose: turn useful conversations into a living, testable knowledge system without making the user manage storage mechanics.

## Design choice

Use **private Git as the canonical knowledge system of record** and **Google Docs / Drive as the human reading, collaboration, and publishing layer**.

Do not use the current public `ego-lite-andy-` repository for private Bruce capability state, confidential business cases, or sensitive company information. This public repository should contain only generic, shareable architecture, templates, schemas, and verified methods.

Recommended long-term flow:

`Private work/context -> selective capture -> structured asset in private Git -> reuse/validation -> Shareable Verified -> optional Google Docs publication`

## The four required capabilities

### 1. Detect what is worth capturing

A capture candidate should be raised only when the conversation produces durable reusable value. Strong signals include:

- a decision-changing insight;
- a recurring pattern seen across tasks;
- a failed approach that creates a durable guardrail;
- a reusable checklist, workflow, decision tree, or evaluation rule;
- a counterexample that changes the boundary of an existing method;
- an A/B-proven improvement.

Weak signals that should normally **not** trigger capture:

- routine factual answers;
- one-off formatting or rewriting;
- attractive wording without reusable logic;
- a method that merely sounds more sophisticated;
- unverified intuition with no clear decision value.

Default behavior: suggest capture compactly, do not interrupt normal work, and do not auto-promote the idea to a baseline.

### 2. Track reuse and outcomes

Every reusable asset should be able to accumulate evidence from later use.

Track, where relevant:

- task class and context of reuse;
- whether it changed a decision or action;
- whether it reduced effort, ambiguity, or error;
- whether the outcome was a win, mixed, fail, or still unknown;
- any new counterexample;
- whether the asset should be revised, narrowed, or promoted.

Lifecycle:

`Candidate -> Reused -> Validated / Revised -> Verified`

A single successful reuse should not automatically globalize the method.

### 3. Expire, downgrade, and deprecate stale knowledge

Important knowledge should carry time, scope, and lineage.

Use statuses such as:

- `candidate` — useful hypothesis, not yet validated;
- `reused` — used again, outcome evidence exists;
- `validated` — repeated evidence supports the method in a stated scope;
- `verified` — strong enough for stable reuse in that scope;
- `deprecated` — no longer recommended but retained for history;
- `superseded` — replaced by a newer asset with explicit lineage.

Do not silently delete or overwrite important old methods. Preserve transitions such as:

`Baseline v1 -> Deprecated -> Baseline v2`

### 4. Shareable Verified gate

A private or useful asset is not automatically safe or clear enough to share.

Before `shareable_verified`, require all of the following:

- personal and company-sensitive information removed;
- understandable without the original private conversation;
- problem, intended use, input, and output are clear;
- applicability and non-applicability are explicit;
- at least one meaningful counterexample / exception is recorded;
- practical example, test, benchmark, or evaluation path exists;
- uncertainty is not silently promoted into certainty;
- no confidential source material is embedded.

Only then may a private method move into the shareable knowledge layer.

## Knowledge object

Each durable asset should use the generic schema in `knowledge-asset.schema.json` and the human template in `asset-template.md`.

The schema is intentionally storage-neutral. A future private BruceAI knowledge repository can use Markdown + JSON/YAML front matter, a database, or an indexer while preserving the same lifecycle semantics.

## Recommended private repository layout

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

## Google Docs role

Use Google Docs for polished outputs, collaboration, workshops, management reading, and selective external sharing. Do not make Docs the sole canonical source for lifecycle-sensitive knowledge that needs machine-readable status, diffs, lineage, A/B promotion, or automated validation.

## User interface

The user should only need to say:

`BruceAI沉淀：把这次有价值的东西抽象成通用、可验证、可分享的方法。`

BruceAI should decide whether to create a private case, candidate method, playbook, skill, eval, baseline update, or shareable publication candidate.

## Success criterion

The knowledge base is succeeding when it contains **more validated reusable judgment**, not merely more documents.
