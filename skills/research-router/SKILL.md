---
name: research-router
description: Default web research router and evidence layer. Use this skill whenever the user asks to search, look up, research, verify, compare, investigate, check latest/current information, inspect a website, or make an important decision using online information. Route broad public discovery through the best available web/search tool, route dynamic or authenticated pages through ego-browser, and use both for high-confidence verification. When downstream strategy, decision, innovation, challenge, planning, or other reasoning depends materially on external facts, build a compact Evidence Pack first so those skills reason from verified evidence instead of inventing premises. Support the simple BruceAI A/B evolution mode by comparing the current validated baseline against one isolated candidate and promoting only proven improvements. Prefer this skill as the entry point for web-backed research unless the user explicitly asks not to use the web.
metadata:
  version: "1.3.1"
  date: "2026-09-05"
---

# research-router

This skill is a routing and verification policy, not a search engine. Its job is to choose the right research path automatically so the user does not need to say which tool to use.

## Core behavior

When the user asks for web-backed information, first classify the task, then route it:

1. **Broad public discovery** — Use the best available native web/search tool when the information is public, indexable, and the goal is breadth: news, policies, product documentation, public company information, background research, multiple-source comparison.
2. **Live page verification** — Use `ego-browser` when the answer depends on the actual rendered page, JavaScript state, filters, a table that must be expanded, a logged-in session, a dashboard, a portal, a booking/availability page, or information hidden behind interactions.
3. **Deep verification** — For important, contested, costly, time-sensitive, or user-decision-critical questions, combine both layers: broad search to discover the landscape, first-party sources to establish the rule, then `ego-browser` to verify the real current page where useful.
4. **Search fallback** — If no native web search tool exists in the current agent environment, use `ego-browser` to search through a search engine or the target site's own search, then continue with the same verification rules.

Do not ask the user which route to use unless the task genuinely requires a choice they must make. Tool selection is the agent's job.

## Research OS role and downstream handoff

Treat research-router as a shared evidence layer, not as an isolated research-only skill.

When a downstream task such as decision-making, strategy, innovation, challenge, business planning, or execution design depends materially on external facts, run the relevant research first and build a compact **Evidence Pack** using `skills/research-router/references/evidence-pack.md`. The downstream layer should reason from that pack instead of reconstructing facts from memory or inventing missing premises.

Do **not** force Research OS into tasks that do not need external evidence. Rewriting supplied text, translation, purely creative drafting, simple arithmetic, and other transformations based entirely on user-provided context should proceed directly unless the user explicitly asks for verification or outside research. Avoid web calls and Evidence Pack overhead when they cannot improve the answer.

The Evidence Pack is normally an internal handoff, not extra user-facing verbosity. Preserve claim status, source scope, conflicts, and unknowns through the handoff. A downstream skill must not silently upgrade `Needs verification` or `High probability` evidence into confirmed fact. If downstream reasoning reveals a missing fact that could materially change the decision, route back through research-router to gather it.

For consequential tasks, challenge the first plausible conclusion before final handoff. Look for a material counterexample, exception, newer source, account-specific restriction, hidden dependency, or alternative explanation. Update the Evidence Pack if the challenge changes the evidence state.

## BruceAI simple evolution interface

Keep experimentation simple for the user. The user should not need to manage Stable/Lab/Shared/Candidate modes or understand internal branch, router, Evidence Pack, or tool topology.

Use only two practical interfaces:

- **`BruceAI: <task>`** — use the current validated baseline and automatically invoke only the internal capabilities that materially improve the task.
- **`BruceAI A/B: <task>`** — compare the current validated baseline (A) with one isolated candidate path (B) on the same real task, then return the best usable answer plus a compact comparison and evolution verdict.

An explicit **`BruceAI A/B`** invocation always means **system-version A/B**: A is the current validated BruceAI baseline and B is one isolated candidate. Do not reinterpret those letters as two business strategies or invent `方案A/方案B`. Only compare business options when the user explicitly supplies or asks for business option A/B. If both are present, keep the axes separate: both system versions evaluate the same business options.

Follow `skills/research-router/references/ab-evolution.md` for comparison fairness, scoring, safety vetoes, output discipline, disambiguation, and promotion. Do not dump two full reports by default. A candidate must remain isolated from the default baseline until it demonstrates a material real-task improvement and passes all standing regression and safety gates. If B wins and is promoted, it becomes the new A for the next experiment. If the result is mixed, task-specific, or effectively tied, keep A and avoid complexity for its own sake.

## Default decision tree

Use **native search first** when most of these are true:
- the source is public and indexable;
- multiple independent sources are useful;
- the user wants market/news/policy/product comparison;
- no login or page interaction is needed;
- freshness can be established from publication/update dates.

Use **ego-browser first** when any of these are true:
- the user says "open the site", "go in and check", "use the real page", "log in", "click", "fill", "inspect", "look at the dashboard", or equivalent;
- the target page is authenticated or depends on the user's session;
- the page is a SPA/JS-heavy app and search snippets are incomplete;
- the answer depends on current filters, live availability, a table, seat inventory, account status, form state, or a page-specific restriction;
- search results conflict with what the live site currently shows.

When live verification is needed and the page exposes a **bounded first-party or site-specific structured tool** for the needed state (for example a browser-side site tool such as WebMCP), prefer that structured interface before generic DOM scraping or a full-page semantic snapshot when it provides equivalent or better freshness and scope. This reduces brittle selectors, irrelevant page text, and unnecessary context exposure. Keep DOM/snapshot extraction available as a fallback or contradiction check. Structured does not automatically mean authoritative: still verify the exact account, variant, year, region, cohort, plan, date, and scope when those dimensions matter.

Use **both** when any of these are true:
- the user asks to "confirm", "double-check", "seriously verify", "cross-check", or make a consequential decision;
- policy/eligibility/fees/tax/regulatory rules matter;
- stale cached pages could materially change the answer;
- a first-party rule and the user's actual logged-in state both matter;
- one source conflicts with another.

## Evidence ranking: authority × specificity × freshness

Do not use a single rigid source ladder when evidence has different scopes. Rank evidence on three dimensions together:

- **Authority** — Is it first-party, regulator, official documentation, or a weaker secondary/community source?
- **Specificity** — Does it apply to this exact user/account/cohort/plan/region/section/product variant, or only to the general population?
- **Freshness** — Is it current for the decision date and current state, or cached/outdated?

For a user's **actual current state**, a current authenticated first-party page or current user-supplied screenshot of that page can be more probative than a generic first-party FAQ. For a **general rule**, current first-party policy remains stronger than a one-off UI label unless the UI explicitly states a scoped rule. Explain the scope difference instead of declaring one source universally superior.

When sources disagree, ask which dimension explains it: date, jurisdiction, cohort, plan, product version, account state, reserved inventory, eligibility, or source quality. Do not average conflicting sources.

## Personal eligibility and aggregate data

Never infer a user's personal eligibility from aggregate availability alone.

Examples of aggregate fields that may be misleading include:
- course-level or event-level `Avail` when some seats are reserved;
- inventory totals that include regions, cohorts, member tiers, or fare classes the user cannot access;
- public plan/product availability that depends on account or address eligibility;
- hotel/restaurant/flight availability that changes by party size, rate class, account, or dates.

Before saying "you can get/use/register/book this", verify the relevant section/account-level restrictions when possible. If authenticated verification is unavailable, say that the aggregate status is confirmed but the user's actual eligibility remains unconfirmed.

## Verification ladder

For important conclusions, research in this order unless the task calls for something else:

1. **First-party authoritative source** — official policy, official documentation, regulator, institution, product documentation, direct company announcement.
2. **Live first-party page** — verify the currently rendered page with `ego-browser` when the real page state matters.
3. **Independent authoritative source** — reputable reporting, academic source, recognized industry source, or other strong secondary evidence.
4. **Community evidence** — Reddit/forums/social posts only for sentiment, edge cases, practical experience, or when the user explicitly asks what people are saying. Never let community evidence override an authoritative rule without explaining the conflict.

This ladder is a starting point, not a substitute for the authority × specificity × freshness test above.

## Search-result discipline

Treat search snippets as **navigation hints, not final evidence**, when the underlying source is available.

- Open or fetch the underlying page before relying on a policy, price, eligibility, requirement, or current-status claim.
- Check the page date, variant, region, cohort, plan, and account scope.
- If a snippet and the opened page differ, use the opened page and explain the discrepancy if material.
- If the source cannot be opened, downgrade confidence rather than silently treating the snippet as authoritative.

## Two-pass research protocol

For consequential research, do not stop after the first plausible answer.

**Pass 1 — build the best current hypothesis**
- fan out a few targeted queries rather than one overly broad query;
- prefer current first-party sources;
- note dates, scope, eligibility, and definitions;
- form a provisional answer.

**Pass 2 — try to break it**
- search for an exception, conflicting official page, newer update, cohort-specific rule, restriction, hidden fee, or contrary evidence;
- when relevant, open the actual page in `ego-browser` and inspect the current rendered state;
- revise the answer if the live page or stronger/more specific source disagrees.

For final reporting, separate important findings into:
- **Confirmed** — directly supported by current authoritative evidence;
- **High probability** — strong evidence but one material uncertainty remains;
- **Needs verification** — cannot be confirmed from available sources or requires the user's authenticated state.

Use the user's language for these labels.

## Search quality rules

- Prefer a small set of high-quality sources over many low-quality copies.
- For fast-moving topics, prioritize explicit recent dates and re-check freshness before answering.
- Search with alternate wording when a result set looks suspiciously narrow.
- For product/course/plan names, verify exact variant, year, region, cohort, and version.
- For numeric claims, verify units, currency, tax inclusion, time period, and denominator.
- For screenshots or user-supplied live pages, treat the screenshot as strong evidence of the user's actual state and reconcile it against public documentation rather than overriding it with generic web pages.
- Never fabricate access to a logged-in page. If `ego-browser` is unavailable in the current environment, say that the live-page layer is unavailable and continue with the strongest available public evidence.

## Safe replacement sequence

When the user is replacing a currently valid scarce or valuable state — for example a reservation, course registration, booking, seat, account setting, plan, or other reversible asset — prefer **secure-new-before-release-old** when the system allows it.

Do not recommend releasing the current valid state based only on aggregate availability or an unverified alternative. First establish that the replacement is actually obtainable and valid for the user, then release the old state. If the platform forces a swap or makes that sequence impossible, identify the risk explicitly before action.

## Ego execution policy

When routing to `ego-browser`, follow `skills/ego-browser/SKILL.md` for browser control.

Use ego for **read-only verification autonomously** when the user has asked for research: navigation, search, opening pages, applying harmless filters, expanding sections, reading tables, extracting structured data, and taking screenshots do not require a separate confirmation.

Treat the following as state-changing actions and do not perform them merely because research was requested: sending messages, submitting applications, purchasing, paying, deleting, posting, changing account settings, booking, enrolling/dropping courses, or any action with material external effect. Perform those only when the user has explicitly requested the action or has clearly delegated that bounded class of actions.

Never expose passwords, tokens, cookies, or session secrets. Do not persist secrets in site learnings.

## Site learnings

The ego-browser runtime supports reusable site learnings under `skills/ego-browser/learnings/<site>/`.

After a workflow succeeds repeatedly on the same site, consider capturing durable, non-sensitive knowledge such as:
- stable navigation paths;
- durable selectors or semantic anchors;
- where live status or restrictions are shown;
- which page is authoritative for a specific field;
- safe read-only steps that save repeated exploration.

Do not store user-specific private data, credentials, temporary IDs, unstable pixel coordinates, or anything that would make a learning unsafe to reuse. Validate site learnings before relying on them.

## Regression cases

Before materially weakening any of the rules above, review `skills/research-router/evals/cases.json`. Those cases capture recurring failure modes such as generic-policy-overriding-account-state, aggregate-inventory-overclaiming, snippet-as-source, variant mismatch, unsafe replacement sequencing, unnecessary live-browser use, generic-DOM-over-structured-site-tool routing, concurrent CDP isolation assumptions, unnecessary research routing, downstream certainty inflation, user-facing mode proliferation, system-A/B-vs-business-option confusion, and promoting a candidate because it sounds more impressive rather than because it wins a controlled real-task comparison.

## Monitoring and polling

Do not use ego-browser for aggressive high-frequency refreshing, anti-bot bypass, or behavior prohibited by the target site's rules. Prefer official waitlists, notifications, APIs, feeds, or a reasonable low-frequency monitoring mechanism when available.

For monitoring tasks, distinguish:
- **public-change monitoring** — suitable for search/automation;
- **authenticated real-time state** — only claim visibility when ego-browser is actually connected to the user's session;
- **official queue/waitlist systems** — prefer them over custom polling when they are more authoritative or faster.

## Output discipline

The final answer should make clear, without overexplaining tool mechanics:
- what is established;
- what changed from the first hypothesis, if anything;
- what remains uncertain;
- what the user should do next.

If live-page verification materially changed the answer, say so plainly. If the current environment could not use ego-browser, do not imply that it did.
