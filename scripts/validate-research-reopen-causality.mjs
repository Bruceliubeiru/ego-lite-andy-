import assert from 'node:assert/strict';
import { deriveMaterialReopenCoverageKeys, selectNextResearchAction } from './research-control.mjs';

const receipt = {
  reopen_coverage_key: 'official-policy:effective-date',
  material_state_observed: true,
  action: {
    expected_delta: 'resolve_scope',
    coverage_key: 'official-policy:effective-date',
  },
  before: { revision: 7, scope_status: 'partial' },
  after: { revision: 8, scope_status: 'resolved' },
  observation: { status: 'completed' },
};

assert.deepEqual(
  deriveMaterialReopenCoverageKeys({ evidence: [receipt] }),
  [],
  'a successful read must not authorize an immediate reread of itself merely because it changed the ledger',
);

const independentReceipt = {
  ...receipt,
  action: {
    ...receipt.action,
    coverage_key: 'change-ledger:policy-revision',
  },
};
assert.deepEqual(
  deriveMaterialReopenCoverageKeys({ evidence: [independentReceipt] }),
  ['official-policy:effective-date'],
  'a realized material transition from another bounded surface may reopen the affected covered surface',
);

const action = {
  id: 'verify-official-policy',
  coverage_key: 'official-policy:effective-date',
  decision_relevance: 'material',
  scope_fit: 'exact',
  evidence_novelty: 'same_lineage',
  breadth: 'bounded',
  cost: 'low',
  risk: 'read_only',
};
assert.equal(
  selectNextResearchAction({
    state: {
      decision_sensitive: true,
      completed_coverage_keys: ['official-policy:effective-date'],
      material_reopen_evidence: [receipt],
    },
    candidates: [action],
  }).mode,
  'stop',
  'explicit self-authorizing evidence must not bypass completed coverage',
);

console.log('research reopen causality gate passed');
