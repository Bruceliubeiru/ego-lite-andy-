# BruceAI Shareable Method Baseline v1

**Stage baseline date:** 2026-09-05  
**Status:** Current baseline  
**Purpose:** Define how BruceAI turns valuable real-task reasoning into reusable, testable, shareable methods without mixing private capability state or confidential context into the public knowledge layer.

## North star

Do not only use AI to produce better answers. Convert genuinely valuable thinking into reusable capability for the next task.

BruceAI therefore compounds along two separate lines:

1. **Personal evolution** — adapt challenge depth, reasoning level, research depth, and workflow to the user's demonstrated capability.
2. **General asset creation** — extract verified decision logic from real work and turn it into reusable cases, principles, playbooks, skills, prompts, and evals.

These lines must remain separable. Private user context and company-confidential material do not belong in the shareable/public method layer.

## Standard distillation chain

`Real problem -> Effective judgment -> Why it worked -> De-personalize -> Boundary/counterexample -> Cross-case validation -> Reusable asset`

1. **Real problem** — start from an actual decision, operating, research, organization, innovation, or execution problem.
2. **Effective judgment** — identify what actually changed the conclusion, action, or priority.
3. **Why it worked** — preserve the important assumptions, evidence, counterexamples, and rejected path.
4. **De-personalize** — remove names, company-specific facts, private data, and one-off context while keeping the transferable structure.
5. **Boundary / counterexample** — state where the method stops working and what evidence would falsify it.
6. **Cross-case validation** — test the structure on another domain, object, or case before claiming broad generality.
7. **Reusable asset** — choose the smallest useful form: case card, checklist, decision tree, playbook, prompt contract, skill, or eval.

## Six elements to preserve from a high-value case

Every important reusable case should try to retain:

1. **Problem** — what was the real problem rather than the surface wording?
2. **Wrong First Approach** — what plausible first solution, default habit, or framing could have been wrong, and why?
3. **Key Insight** — what changed the judgment?
4. **Decision Logic** — which variables determine A vs B, and how do they relate?
5. **Boundary / Counterexample** — when does the method fail, and what would disprove it?
6. **Reusable Artifact** — what should this become: decision tree, checklist, playbook, skill, prompt, or eval case?

## What to preserve from "reasoning"

The shareable asset should not try to preserve a hidden or verbatim internal chain of thought. It should preserve the reasoning structure another person or agent needs to reproduce judgment quality:

- key assumptions;
- evidence and decision criteria;
- rejected alternatives and why they were rejected;
- material counterexamples;
- decision principles;
- scope and failure boundaries;
- final framework and action logic.

The goal is reproducibility of judgment, not replay of every internal token or tentative thought.

## What deserves distillation

Prefer to distill:

- recurring problems;
- insights that materially changed a decision;
- methods that transfer across scenarios;
- lessons formed from a real failure or execution constraint;
- judgments that can be expressed as a decision tree;
- new workflows that have won through A/B or multiple-case validation.

Usually do not distill:

- one-off answers;
- background material that did not change the conclusion;
- frameworks that only sound sophisticated;
- slogans with no falsifiable boundary;
- details inseparable from one context;
- personal preferences promoted to general rules without evidence.

## Maturity ladder for shareable assets

- **L0 Raw conversation** — useful but highly context-dependent.
- **L1 Case card** — problem, judgment, result, and counterexample are explicit.
- **L2 General principle** — still holds after specific context is removed.
- **L3 Playbook / Checklist / Decision tree** — another person can execute it.
- **L4 Skill / Prompt contract** — stable trigger, inputs, steps, outputs, and boundaries.
- **L5 Eval / Benchmark** — can test whether the new method is actually better than the old one.
- **L6 Shareable product** — can be repeatedly used by a team, friend, or customer.

## Private vs shareable boundary

### Bruce Private

May contain:

- private capability model;
- real business context;
- internal cases;
- personal preferences;
- unreleased project experience.

It should not be published as a public skill or public data source.

### BruceAI General / Shareable

May contain:

- anonymized methods;
- general frameworks;
- explicit boundaries;
- counterexamples;
- templates;
- playbooks;
- evals.

It must not contain personal sensitive information, company secrets, concrete internal data, or non-public material.

## Minimal user invocation

Keep the user-facing method simple:

`BruceAI沉淀: 把这次有价值的东西抽象成通用、可验证、可分享的方法。`

Useful variants:

- **Standard distillation** — `BruceAI沉淀: 把这次讨论沉淀成通用方法。`
- **Shareable version** — `BruceAI沉淀: 把这次讨论抽象成可分享版本，去除个人和公司背景，保留最有价值的判断逻辑、反例、决策树和使用方法。`
- **Skill version** — `BruceAI沉淀: 把这次有效方法做成通用 Skill v1，包括触发条件、输入、执行步骤、输出格式、适用边界、反例、Eval cases 和最小调用方式。`
- **High-value full distillation** — `BruceAI沉淀: 不要只总结结论。把这次从问题定义、错误路径、关键洞察、决策依据、反例、适用边界到最终方法完整抽象出来。先保留案例版，再生成匿名通用版，最后判断是否值得升级成通用 Skill。`

## BruceAI's default judgment when distilling

The system should automatically:

- first decide whether the material is worth preserving;
- separate case facts, inference, heuristics, and general principles;
- challenge the first plausible approach and look for a material counterexample;
- remove personal/company/project-specific details from the shareable version;
- state enabling conditions, failure conditions, and non-transferable boundaries;
- choose the right asset form instead of always creating another skill;
- label insufficiently proven methods as **Candidate** rather than **Baseline**;
- require real-task A/B or cross-case proof before promoting a candidate into a shared baseline.

## Current-stage baseline

As of 2026-09-05, BruceAI should follow these rules:

1. BruceAI evolution is judged by real-task quality improvement, not by growth in the number of skills.
2. Personal capability evolution and general-method distillation are parallel compounding loops.
3. Real problems come before framework invention; reusable methods should grow from real cases.
4. High-value distillation should preserve: problem, wrong path, key insight, decision logic, counterexample/boundary, and reusable artifact.
5. A general method must be anonymized, de-confidentialized, checked for transferability, and accompanied by explicit boundaries.
6. New methods remain **Candidate** until A/B or multiple-case validation supports promotion.
7. Private capability state remains separate from public/shareable method assets.
8. The long-term target is not a pile of notes, but an executable, testable, continuously improvable **BruceAI Playbook Library**.

## Suggested long-term source structure

- `01_Cases` — real cases and case cards
- `02_Principles` — validated general principles
- `03_Playbooks` — executable methods and workflows
- `04_Skills` — stable skills and prompt contracts
- `05_Evals` — regression cases, A/B standards, benchmarks
- `06_Counterexamples` — counterexamples and failed cases
- `07_Candidates` — not-yet-validated candidate methods
- `08_Baselines` — stage baselines and version notes

Private capability models, confidential business context, and sensitive material stay in private data sources and do not enter this shareable layer.

## One-line principle

**Do not only let AI help you think better; turn every truly valuable piece of thinking into reusable capability for the next time.**
