# BruceAI Knowledge Asset Template

Use this template for durable knowledge assets. Keep the user-facing process simple; these fields are an internal knowledge contract.

## Identity

- **ID:**
- **Title:**
- **Asset type:** case / principle / playbook / skill / eval / counterexample / baseline
- **Status:** candidate / reused / validated / verified / deprecated / superseded
- **Visibility:** private / shareable_candidate / shareable_verified
- **Created:**
- **Last validated:**
- **Scope / task class:**

## Problem

What real problem did this asset help solve?

## Wrong first approach

What initially plausible approach was rejected, and why?

## Key insight

What actually changed the judgment?

## Decision logic

Which variables, conditions, or trade-offs determine the recommended action?

## Applicability

When should this method be used?

## Non-applicability / boundaries

When should it not be used?

## Counterexamples and exceptions

What evidence or scenario would weaken or falsify it?

## Reusable artifact

Checklist, decision tree, prompt contract, workflow, playbook steps, skill behavior, or eval rule.

## Evidence and confidence

Separate confirmed facts, high-probability claims, inference, and unresolved uncertainty where relevant.

## Reuse log

For each material reuse, record:

- date;
- task class;
- outcome: win / mixed / fail / unknown;
- whether it changed the decision or action;
- effort / ambiguity / error impact;
- new counterexample or failure;
- whether the asset should be promoted, narrowed, revised, deprecated, or left unchanged.

## Lineage

- **Supersedes:**
- **Superseded by:**
- **Related assets:**

## Shareable Verified gate

Before changing visibility to `shareable_verified`, confirm:

- [ ] personal information removed;
- [ ] company-sensitive / confidential information removed;
- [ ] understandable without original private context;
- [ ] problem, intended use, input, and output are clear;
- [ ] applicability and non-applicability are explicit;
- [ ] meaningful counterexample / exception included;
- [ ] practical example, test, benchmark, or evaluation path exists;
- [ ] uncertainty is not promoted into certainty;
- [ ] no confidential source material is embedded.

## Promotion note

Why is this asset ready for its current status? If evidence is narrow, keep the promotion task-class-specific rather than global.
