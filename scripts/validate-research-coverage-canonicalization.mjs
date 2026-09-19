import assert from 'node:assert/strict';
import {
  deriveMaterialReopenAuthorizations,
  deriveMaterialReopenCoverageKeys,
  selectNextResearchAction,
  updateResearchCoverage,
  updateResearchRunState,
} from './research-control.mjs';

const baseAction = {
  id: 'verify-official-policy',
  decision_relevance: 'material',
  scope_fit: 'exact',
  evidence_novelty: 'same_lineage',
  breadth: 'bounded',
  cost: 'low',
  risk: 'read_only',
};
const realizedScopeReceipt = {
  coverage_key: ' official-policy:effective-date ',
  material_state_observed: true,
  action: { expected_delta: 'resolve_scope', coverage_key: 'official-policy:effective-date' },
  before: { revision: 7, scope_status: 'partial' },
  after: { revision: 8, scope_status: 'resolved' },
  observation: { status: 'completed' },
};

assert.deepEqual(
  updateResearchCoverage({
    completed: [' official-policy:effective-date ', '', null],
    action: { coverage_key: ' official-policy:effective-date ' },
    outcome: { status: 'completed', material_state_observed: true },
  }),
  ['official-policy:effective-date'],
  'coverage memory should canonicalize and deduplicate semantic keys',
);

assert.equal(
  selectNextResearchAction({
    state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] },
    candidates: [{ ...baseAction, coverage_key: ' official-policy:effective-date ' }],
  }).mode,
  'stop',
  'whitespace variants must not reopen an already covered surface',
);

assert.equal(
  selectNextResearchAction({
    state: { decision_sensitive: true, completed_coverage_keys: [' official-policy:effective-date '] },
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
  }).mode,
  'stop',
  'legacy non-canonical completed keys should still block the same surface',
);

assert.equal(
  selectNextResearchAction({
    state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] },
    candidates: [{ ...baseAction, coverage_key: '   ' }],
  }).action_id,
  'verify-official-policy',
  'blank coverage metadata must not create a synthetic covered surface',
);

assert.equal(
  selectNextResearchAction({
    state: { decision_sensitive: true, completed_coverage_keys: ['official-policy:effective-date'] },
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date', reopened_by_material_evidence: true }],
  }).mode,
  'stop',
  'a candidate-local reopen assertion must not bypass completed coverage without verified material state',
);

assert.equal(
  selectNextResearchAction({
    state: {
      decision_sensitive: true,
      completed_coverage_keys: ['official-policy:effective-date'],
      material_reopen_coverage_keys: [' official-policy:effective-date '],
    },
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
  }).mode,
  'stop',
  'a bare state reopen key must not bypass coverage without evidence of realized decision delta',
);

assert.deepEqual(
  deriveMaterialReopenCoverageKeys({ evidence: [realizedScopeReceipt] }),
  ['official-policy:effective-date'],
  'a completed material observation with realized delta and monotonic revision should derive a reopen key',
);

assert.deepEqual(
  deriveMaterialReopenAuthorizations({ evidence: [realizedScopeReceipt] }),
  [{
    coverage_key: 'official-policy:effective-date',
    transition_key: 'official-policy:effective-date@7->8',
    after_revision: 8,
  }],
  'reopen authority should be bound to a deterministic material transition identity',
);

const firstSelection = selectNextResearchAction({
  state: {
    decision_sensitive: true,
    completed_coverage_keys: ['official-policy:effective-date'],
    material_reopen_evidence: [realizedScopeReceipt],
  },
  candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
});
assert.equal(firstSelection.action_id, 'verify-official-policy');
assert.equal(
  firstSelection.reopen_transition_key,
  'official-policy:effective-date@7->8',
  'selector should expose the exact transition authorization that permitted reopening',
);

const stateAfterCompletedRecheck = updateResearchRunState({
  state: {
    decision_sensitive: true,
    completed_coverage_keys: ['official-policy:effective-date'],
    material_reopen_evidence: [realizedScopeReceipt],
  },
  selection: firstSelection,
  action: { ...baseAction, coverage_key: 'official-policy:effective-date' },
  outcome: { status: 'completed', material_state_observed: true },
});
assert.deepEqual(
  stateAfterCompletedRecheck.consumed_reopen_transition_keys,
  ['official-policy:effective-date@7->8'],
  'a successful reopened read should consume its material transition authorization',
);
assert.equal(
  selectNextResearchAction({
    state: stateAfterCompletedRecheck,
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
  }).mode,
  'stop',
  'replaying the same realized-delta receipt must not reopen the surface a second time',
);

const stateAfterReplay = updateResearchRunState({
  state: stateAfterCompletedRecheck,
  selection: firstSelection,
  action: { ...baseAction, coverage_key: 'official-policy:effective-date' },
  outcome: { status: 'completed', material_state_observed: true },
});
assert.deepEqual(
  stateAfterReplay.consumed_reopen_transition_keys,
  ['official-policy:effective-date@7->8'],
  'applying the same completion twice must be idempotent',
);

const forgedSelectionState = updateResearchRunState({
  state: {
    decision_sensitive: true,
    completed_coverage_keys: ['official-policy:effective-date'],
    material_reopen_evidence: [realizedScopeReceipt],
  },
  selection: { ...firstSelection, action_id: 'other-action' },
  action: { ...baseAction, coverage_key: 'official-policy:effective-date' },
  outcome: { status: 'completed', material_state_observed: true },
});
assert.deepEqual(
  forgedSelectionState.consumed_reopen_transition_keys,
  [],
  'run-state update must not consume a transition when the executed action does not match the authorized selection',
);

const failedRecheckState = updateResearchRunState({
  state: {
    decision_sensitive: true,
    completed_coverage_keys: ['official-policy:effective-date'],
    material_reopen_evidence: [realizedScopeReceipt],
  },
  selection: firstSelection,
  action: { ...baseAction, coverage_key: 'official-policy:effective-date' },
  outcome: { status: 'failed', material_state_observed: false },
});
assert.deepEqual(
  failedRecheckState.consumed_reopen_transition_keys,
  [],
  'acquisition failure must not consume the transition authorization as if the material state was observed',
);
assert.equal(
  selectNextResearchAction({
    state: failedRecheckState,
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
  }).action_id,
  'verify-official-policy',
  'a failed acquisition may be retried because failure is not negative or completed coverage evidence',
);

for (const receipt of [
  { ...realizedScopeReceipt, material_state_observed: false },
  { ...realizedScopeReceipt, observation: { status: 'failed' } },
  { ...realizedScopeReceipt, after: { scope_status: 'partial' } },
  { ...realizedScopeReceipt, action: { ...realizedScopeReceipt.action, expected_delta: 'unknown-delta' } },
  { ...realizedScopeReceipt, coverage_key: 'other-surface:material-change' },
  { ...realizedScopeReceipt, action: { ...realizedScopeReceipt.action, coverage_key: 'other-surface:material-change' } },
  { ...realizedScopeReceipt, before: { scope_status: 'partial' } },
  { ...realizedScopeReceipt, after: { scope_status: 'resolved' } },
  { ...realizedScopeReceipt, after: { revision: 9, scope_status: 'resolved' } },
]) {
  assert.deepEqual(
    deriveMaterialReopenCoverageKeys({ evidence: [receipt] }),
    [],
    'incomplete, unrealized, scope-mismatched, or non-monotonic transition evidence must not derive reopen authority',
  );
}

assert.deepEqual(
  deriveMaterialReopenCoverageKeys({
    evidence: [realizedScopeReceipt],
    consumed: [' official-policy:effective-date@7->8 '],
  }),
  [],
  'consumed transition authorization must remain closed under canonicalized replay state',
);

const newerScopeReceipt = {
  ...realizedScopeReceipt,
  before: { revision: 8, scope_status: 'partial' },
  after: { revision: 9, scope_status: 'resolved' },
};
assert.deepEqual(
  deriveMaterialReopenCoverageKeys({
    evidence: [realizedScopeReceipt, newerScopeReceipt],
    consumed: ['official-policy:effective-date@8->9'],
  }),
  [],
  'a consumed newest transition must not fall back to an older unconsumed transition for the same surface',
);

for (const [field, invalidValue] of [
  ['decision_relevance', 'decisivee'],
  ['scope_fit', 'exact-ish'],
  ['evidence_novelty', 'new'],
  ['breadth', 'narrow'],
  ['cost', 'cheap'],
]) {
  const malformed = { ...baseAction, [field]: invalidValue };
  assert.equal(
    selectNextResearchAction({
      state: { decision_sensitive: true },
      candidates: [malformed],
    }).mode,
    'stop',
    `unknown ${field} must fail closed instead of becoming an executable ranked action`,
  );
}

assert.equal(
  selectNextResearchAction({
    state: { decision_sensitive: true },
    candidates: [
      { ...baseAction, id: 'malformed', decision_relevance: 'decisivee' },
      { ...baseAction, id: 'valid' },
    ],
  }).action_id,
  'valid',
  'a malformed candidate must not displace a valid safe read',
);

console.log('research replay-safe coverage authorization and action metadata validation passed');
