import assert from 'node:assert/strict';
import { deriveMaterialReopenAuthorizations, selectNextResearchAction, updateResearchRunState } from './research-control.mjs';

const target = 'official-policy:effective-date';
const source = 'live-account:policy-state';
const baseAction = { id: 'recheck-official-policy', coverage_key: target, decision_relevance: 'material', scope_fit: 'exact', evidence_novelty: 'same_lineage', breadth: 'bounded', cost: 'low', risk: 'read_only' };
const receipt = {
  coverage_key: source,
  material_state_observed: true,
  action: { coverage_key: source, reopen_target_coverage_key: target, expected_delta: 'resolve_scope' },
  before: { revision: 11, scope_status: 'partial' },
  after: { revision: 12, scope_status: 'resolved' },
  observation: { status: 'completed' },
};
const dependency = { source_coverage_key: source, target_coverage_key: target, revision: 11 };

assert.deepEqual(
  deriveMaterialReopenAuthorizations({ evidence: [receipt], dependencies: [dependency] }),
  [{ coverage_key: target, transition_key: `${source}=>${target}@11->12`, after_revision: 12 }],
  'a realized source observation may reopen a different covered target only through a pre-existing state-owned dependency',
);

const state = { decision_sensitive: true, completed_coverage_keys: [target, source], material_reopen_evidence: [receipt], reopen_dependencies: [dependency] };
const selection = selectNextResearchAction({ state, candidates: [baseAction] });
assert.equal(selection.action_id, baseAction.id);
assert.equal(selection.reopen_transition_key, `${source}=>${target}@11->12`);

for (const dependencies of [
  [],
  [{ ...dependency, target_coverage_key: 'other:surface' }],
  [{ ...dependency, source_coverage_key: 'other:source' }],
  [{ ...dependency, revision: 10 }],
  [{ ...dependency, revision: 12 }],
]) {
  assert.deepEqual(
    deriveMaterialReopenAuthorizations({ evidence: [receipt], dependencies }),
    [],
    'missing, forged, wrong-source, or stale/future dependency state must fail closed',
  );
}

assert.deepEqual(
  deriveMaterialReopenAuthorizations({ evidence: [{ ...receipt, coverage_key: target }], dependencies: [dependency] }),
  [],
  'receipt provenance must remain bound to the producing surface rather than the reopen target',
);
assert.deepEqual(
  deriveMaterialReopenAuthorizations({ evidence: [{ ...receipt, observation: { status: 'failed' } }], dependencies: [dependency] }),
  [],
  'acquisition failure must not authorize cross-surface reopening',
);
assert.deepEqual(
  deriveMaterialReopenAuthorizations({ evidence: [{ ...receipt, after: { revision: 13, scope_status: 'resolved' } }], dependencies: [dependency] }),
  [],
  'non-monotonic revisions must not authorize reopening',
);

const failed = updateResearchRunState({ state, selection, action: baseAction, outcome: { status: 'failed', material_state_observed: false } });
assert.deepEqual(failed.consumed_reopen_transition_keys, [], 'failed target acquisition must not consume authorization');
assert.equal(selectNextResearchAction({ state: failed, candidates: [baseAction] }).action_id, baseAction.id);

const completed = updateResearchRunState({ state, selection, action: baseAction, outcome: { status: 'completed', material_state_observed: true } });
assert.deepEqual(completed.consumed_reopen_transition_keys, [`${source}=>${target}@11->12`]);
assert.equal(selectNextResearchAction({ state: completed, candidates: [baseAction] }).mode, 'stop', 'replay must remain closed after successful target observation');

console.log('research state-owned cross-surface reopen authorization passed');
