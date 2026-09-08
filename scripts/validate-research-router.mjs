import fs from 'node:fs';

const skillPath = 'skills/research-router/SKILL.md';
const casesPath = 'skills/research-router/evals/cases.json';
const browserAuthCasesPath = 'skills/research-router/evals/browser-auth-gates.json';
const runtimeReliabilityCasesPath = 'skills/research-router/evals/runtime-reliability-gates.json';
const collaborationCasesPath = 'skills/research-router/evals/collaboration-cases.json';
const concurrencyRefPath = 'skills/research-router/references/ego-concurrency.md';
const evidencePackRefPath = 'skills/research-router/references/evidence-pack.md';
const abEvolutionRefPath = 'skills/research-router/references/ab-evolution.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const data = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const browserAuthData = JSON.parse(fs.readFileSync(browserAuthCasesPath, 'utf8'));
const runtimeReliabilityData = JSON.parse(fs.readFileSync(runtimeReliabilityCasesPath, 'utf8'));
const collaborationData = JSON.parse(fs.readFileSync(collaborationCasesPath, 'utf8'));
const concurrencyRef = fs.readFileSync(concurrencyRefPath, 'utf8');
const evidencePackRef = fs.readFileSync(evidencePackRefPath, 'utf8');
const abEvolutionRef = fs.readFileSync(abEvolutionRefPath, 'utf8');

const requiredIds = [
  'account-specific-vs-generic-policy',
  'aggregate-inventory-vs-eligibility',
  'search-snippet-vs-source',
  'variant-year-region-mismatch',
  'safe-replacement-sequence',
  'static-lookup-vs-live-browser',
  'structured-site-tool-vs-generic-dom',
  'concurrent-ego-cdp-isolation',
  'browser-action-success-vs-observed-postcondition',
  'browser-global-state-mutation-vs-read-only-research',
  'browser-global-read-vs-profile-isolation',
  'same-source-summary-vs-specific-section',
  'ego-ownership-error-vs-observed-ownership',
  'approved-schema-snapshot-vs-live-mcp-schema',
  'tunnel-permission-vs-chatgpt-eligibility',
  'agent-task-space-lifecycle-vs-resource-leak',
  'upstream-main-vs-released-installed-version',
  'research-os-vs-unnecessary-research',
  'evidence-pack-vs-downstream-overclaim',
  'bruceai-ab-vs-user-facing-complexity',
  'ab-candidate-vs-baseline-promotion',
  'bruceai-ab-system-vs-business-options',
];

const requiredBrowserAuthIds = [
  'authenticated-page-verification-vs-auth-mechanism-support',
  'community-port-vs-official-runtime-support',
  'task-space-profile-vs-browser-level-side-effect-scope',
  'privileged-browser-script-vs-sensitive-egress',
  'page-provided-webmcp-tool-vs-trusted-research-interface',
  'browser-profile-import-failure-vs-authenticated-state-absence',
];

const requiredRuntimeReliabilityIds = [
  'browser-helper-time-unit-vs-runtime-contract',
  'browser-timeout-vs-blind-retry-loop',
  'visual-screenshot-timeout-vs-target-local-fallback',
  'browser-navigation-vs-stale-execution-context',
  'site-learning-absence-vs-workspace-resolution-failure',
  'observation-breadth-vs-proof-need',
  'browser-evaluator-null-vs-proven-empty-result',
  'browser-script-construction-failure-vs-page-evidence',
  'batch-rendering-vs-resource-budget',
  'network-waiter-vs-originating-page-session',
];

// Keep collaboration hard gates intentionally small. Orchestration details are
// defaults unless a demonstrated failure mode deserves promotion into a gate.
const requiredCollaborationIds = [
  'evidence-integrity-gate',
  'conflict-resolution-gate',
  'execution-authority-gate',
];

function validateCases(label, caseData, requiredCaseIds) {
  if (!Array.isArray(caseData.cases)) throw new Error(`${label} cases must be an array`);
  const ids = new Set(caseData.cases.map((c) => c.id));
  for (const id of requiredCaseIds) {
    if (!ids.has(id)) throw new Error(`missing ${label} regression case: ${id}`);
  }
  for (const c of caseData.cases) {
    if (!c.id || !c.scenario || !Array.isArray(c.expected) || c.expected.length < 2) {
      throw new Error(`invalid ${label} regression case: ${c.id ?? '<missing id>'}`);
    }
  }
}

validateCases('research-router', data, requiredIds);
validateCases('browser-auth', browserAuthData, requiredBrowserAuthIds);
validateCases('runtime-reliability', runtimeReliabilityData, requiredRuntimeReliabilityIds);
validateCases('collaboration', collaborationData, requiredCollaborationIds);

// Prefer bounded first-party/site-specific structured interfaces when they
// provide the needed live evidence without weakening scope verification.
const requiredGuardrails = [
  /authority.*specificity.*freshness/i,
  /aggregate availability/i,
  /snippet/i,
  /exact variant/i,
  /secure-new-before-release-old/i,
  /(exact user\/account|account-level|actual current state)/i,
  /Use \*\*native search first\*\*/i,
  /Use \*\*ego-browser first\*\*/i,
  /(bounded first-party|site-specific structured tool)/i,
  /(generic DOM|semantic snapshot)/i,
  /Research OS role and downstream handoff/i,
  /Evidence Pack/i,
  /Do \*\*not\*\* force Research OS/i,
  /must not silently upgrade/i,
  /BruceAI simple evolution interface/i,
  /BruceAI A\/B/i,
  /candidate must remain isolated/i,
  /system-version A\/B/i,
  /Do not reinterpret.*business strateg/is,
];
for (const pattern of requiredGuardrails) {
  if (!pattern.test(skill)) throw new Error(`research-router guardrail missing: ${pattern}`);
}

const requiredConcurrencyGuardrails = [
  /citrolabs\/ego-lite#213/i,
  /global.*CDP/i,
  /serialize/i,
  /re-verify.*task space/i,
];
for (const pattern of requiredConcurrencyGuardrails) {
  if (!pattern.test(concurrencyRef)) throw new Error(`Ego concurrency guardrail missing: ${pattern}`);
}

// Collaboration is protected by three concepts, not a long checklist.
const requiredEvidencePackGuardrails = [
  /Question and scope/i,
  /Confirmed.*High probability.*Needs verification/is,
  /Authority.*specificity.*freshness/is,
  /must not silently upgrade/i,
  /Three hard collaboration gates/i,
  /Evidence gate.*Conflict gate.*Execution gate/is,
];
for (const pattern of requiredEvidencePackGuardrails) {
  if (!pattern.test(evidencePackRef)) throw new Error(`Evidence Pack guardrail missing: ${pattern}`);
}

const requiredAbEvolutionGuardrails = [
  /BruceAI: <task>/i,
  /BruceAI A\/B: <task>/i,
  /system-version comparison/i,
  /same business question/i,
  /Do not invent a business `方案A` and `方案B`/i,
  /Business-option comparison is different/i,
  /keep the two axes separate/i,
  /current validated baseline/i,
  /one isolated candidate/i,
  /Correctness and evidence quality/i,
  /Completeness/i,
  /Counterexamples and risk detection/i,
  /Actionability/i,
  /Cost/i,
  /Safety and regression behavior are veto gates/i,
  /A wins \/ B wins — promote \/ Mixed — keep testing/i,
  /promote B.*material real-task improvement/is,
];
for (const pattern of requiredAbEvolutionGuardrails) {
  if (!pattern.test(abEvolutionRef)) throw new Error(`A/B evolution guardrail missing: ${pattern}`);
}

console.log(
  `research-router gate passed: ${data.cases.length} core cases, ${browserAuthData.cases.length} browser-auth cases, ${runtimeReliabilityData.cases.length} runtime-reliability cases, ${collaborationData.cases.length} collaboration hard gates, ${requiredGuardrails.length} routing guardrails, ${requiredConcurrencyGuardrails.length} concurrency guardrails, ${requiredEvidencePackGuardrails.length} evidence-pack guardrails, ${requiredAbEvolutionGuardrails.length} A/B evolution guardrails`,
);
