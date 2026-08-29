import fs from 'node:fs';

const skillPath = 'skills/research-router/SKILL.md';
const casesPath = 'skills/research-router/evals/cases.json';
const skill = fs.readFileSync(skillPath, 'utf8');
const data = JSON.parse(fs.readFileSync(casesPath, 'utf8'));

const requiredIds = [
  'account-specific-vs-generic-policy',
  'aggregate-inventory-vs-eligibility',
  'search-snippet-vs-source',
  'variant-year-region-mismatch',
  'safe-replacement-sequence',
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

const requiredGuardrails = [
  /authority.*specificity.*freshness/i,
  /aggregate availability/i,
  /snippet/i,
  /exact variant/i,
  /secure-new-before-release-old/i,
  /account-specific/i,
];
for (const pattern of requiredGuardrails) {
  if (!pattern.test(skill)) throw new Error(`research-router guardrail missing: ${pattern}`);
}

console.log(`research-router gate passed: ${data.cases.length} cases, ${requiredGuardrails.length} guardrails`);
