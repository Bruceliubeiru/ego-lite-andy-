import assert from 'node:assert/strict';
import { selectNextResearchAction, updateResearchCoverage } from './research-control.mjs';

const baseAction = {
  id: 'verify-official-policy',
  decision_relevance: 'material',
  scope_fit: 'exact',
  evidence_novelty: 'same_lineage',
  breadth: 'bounded',
  cost: 'low',
  risk: 'read_only',
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
  }).action_id,
  'verify-official-policy',
  'verified material state may reopen the matching canonical covered surface',
);

assert.equal(
  selectNextResearchAction({
    state: {
      decision_sensitive: true,
      completed_coverage_keys: ['official-policy:effective-date'],
      material_reopen_coverage_keys: ['other-surface:material-change'],
    },
    candidates: [{ ...baseAction, coverage_key: 'official-policy:effective-date' }],
  }).mode,
  'stop',
  'material evidence for a different surface must not reopen this covered surface',
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

console.log('research coverage canonicalization and action metadata validation passed');
