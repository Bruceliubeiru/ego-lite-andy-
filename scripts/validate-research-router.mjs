import fs from 'node:fs';

const skillPath = 'skills/research-router/SKILL.md';
const casesPath = 'skills/research-router/evals/cases.json';
const concurrencyRefPath = 'skills/research-router/references/ego-concurrency.md';
const skill = fs.readFileSync(skillPath, 'utf8');
const data = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
const concurrencyRef = fs.readFileSync(concurrencyRefPath, 'utf8');

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
  'same-source-summary-vs-specific-section',
  'ego-ownership-error-vs-observed-ownership',
  'approved-schema-snapshot-vs-live-mcp-schema',
  'tunnel-permission-vs-chatgpt-eligibility',
];

if (!Array.isArray(data.cases)) throw new Error('cases must be an array');
const ids = new Set(data.cases.map((c) => c.id));
for (const id of requiredIds) {
  if (!ids.has(id)) throw new Error(`missing regression case: ${id}`);
}
for (const c of data.cases) {
  if (!c.id || !c.scenario || !Array.isArray(c.expected) || c.expected.length < 2) {
    throw new Error(`invalid regression case: ${c.id ?? '<missing id>'}`);
  }
}

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

console.log(`research-router gate passed: ${data.cases.length} cases, ${requiredGuardrails.length} routing guardrails, ${requiredConcurrencyGuardrails.length} concurrency guardrails`);
