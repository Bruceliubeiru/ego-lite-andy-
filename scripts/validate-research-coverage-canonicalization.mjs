import assert from 'node:assert/strict';
import { deriveMaterialReopenCoverageKeys, selectNextResearchAction, updateResearchCoverage } from './research-control.mjs';

const baseAction = { id: 'verify-official-policy', decision_relevance: 'material', scope_fit: 'exact', evidence_novelty: 'same_lineage', breadth: 'bounded', cost: 'low', risk: 'read_only' };
const realizedScopeReceipt = {
  coverage_key: ' official-policy:effective-date ',
  material_state_observed: true,
  action: { expected_delta: 'resolve_scope', coverage_key: 'official-policy:effective-date' },
  before: { scope_status: 'partial' },
  after: { scope_status: 'resolved' },
  observation: { status: 'completed' },
};

assert.deepEqual(updateResearchCoverage({ completed: [' official-policy:effective-date ', '', null], action: { coverage_key: ' official-policy:effective-date ' }, outcome: { status: 'completed', material_state_observed: true } }), ['official-policy:effective-date']);
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] }, candidates: [{ ...baseAction, coverage_key: ' official-policy:effective-date ' }] }).mode, 'stop');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: [' official-policy:effective-date '] }, candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }] }).mode, 'stop');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] }, candidates: [{ ...baseAction, coverage_key: '   ' }] }).action_id, 'verify-official-policy');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] }, candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date', reopened_by_material_evidence: true }] }).mode, 'stop');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'], material_reopen_coverage_keys: ['official-policy:effective-date'] }, candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }] }).mode, 'stop');
assert.deepEqual(deriveMaterialReopenCoverageKeys({ evidence: [realizedScopeReceipt] }), ['official-policy:effective-date']);
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'], material_reopen_evidence: [realizedScopeReceipt] }, candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }] }).action_id, 'verify-official-policy');

for (const receipt of [
  { ...realizedScopeReceipt, material_state_observed: false },
  { ...realizedScopeReceipt, observation: { status: 'failed' } },
  { ...realizedScopeReceipt, after: { scope_status: 'partial' } },
  { ...realizedScopeReceipt, action: { ...realizedScopeReceipt.action, expected_delta: 'unknown-delta' } },
  { ...realizedScopeReceipt, coverage_key: 'other-surface:material-change' },
  { ...realizedScopeReceipt, action: { ...realizedScopeReceipt.action, coverage_key: 'other-surface:material-change' } },
]) {
  assert.deepEqual(deriveMaterialReopenCoverageKeys({ evidence: [receipt] }), []);
}

for (const [field, invalidValue] of [['decision_relevance', 'decisivee'], ['scope_fit', 'exact-ish'], ['evidence_novelty', 'new'], ['breadth', 'narrow'], ['cost', 'cheap']]) {
  assert.equal(selectNextResearchAction({ state: { decision_sensitive: true }, candidates: [{ ...baseAction, [field]: invalidValue }] }).mode, 'stop');
}
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true }, candidates: [{ ...baseAction, id: 'malformed', decision_relevance: 'decisivee' }, { ...baseAction, id: 'valid' }] }).action_id, 'valid');
console.log('research coverage canonicalization, evidence-bound reopening, and action metadata validation passed');
