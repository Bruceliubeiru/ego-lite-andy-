import assert from 'node:assert/strict';
import { deriveMaterialReopenAuthorizations, selectNextResearchAction, updateResearchRunState } from './research-control.mjs';

const actionA = { id:'recheck-a', coverage_key:'surface:a', decision_relevance:'material', scope_fit:'exact', evidence_novelty:'same_lineage', breadth:'bounded', cost:'low', risk:'read_only' };
const receiptB = { coverage_key:'surface:b', material_state_observed:true, action:{ expected_delta:'resolve_scope', coverage_key:'surface:b' }, before:{ revision:10, scope_status:'partial' }, after:{ revision:11, scope_status:'resolved' }, observation:{ status:'completed' } };
const dep = { producer_coverage_key:'surface:b', target_coverage_key:'surface:a', revision:10 };

const auth = deriveMaterialReopenAuthorizations({ evidence:[receiptB], dependencies:[dep] });
assert.ok(auth.some(a => a.coverage_key === 'surface:a' && a.transition_key === 'surface:b=>surface:a@10->11'), 'state-owned dependency should authorize B -> reopen A');

const selection = selectNextResearchAction({ state:{ decision_sensitive:true, completed_coverage_keys:['surface:a','surface:b'], material_reopen_evidence:[receiptB], reopen_dependencies:[dep] }, candidates:[actionA] });
assert.equal(selection.action_id, 'recheck-a');
assert.equal(selection.reopen_transition_key, 'surface:b=>surface:a@10->11');

for (const badDependencies of [
  [],
  [{ ...dep, revision:9 }],
  [{ ...dep, producer_coverage_key:'surface:c' }],
  [{ ...dep, target_coverage_key:'surface:c' }],
  [{ producer_coverage_key:'surface:b', target_coverage_key:'surface:a' }],
]) {
  assert.equal(selectNextResearchAction({ state:{ decision_sensitive:true, completed_coverage_keys:['surface:a'], material_reopen_evidence:[receiptB], reopen_dependencies:badDependencies }, candidates:[actionA] }).mode, 'stop', 'missing, stale, malformed, or wrong dependency must fail closed');
}

assert.equal(selectNextResearchAction({ state:{ decision_sensitive:true, completed_coverage_keys:['surface:a'], material_reopen_evidence:[{...receiptB, observation:{status:'failed'}}], reopen_dependencies:[dep] }, candidates:[actionA] }).mode, 'stop', 'failed acquisition is not reopen evidence');

const consumed = updateResearchRunState({ state:{ decision_sensitive:true, completed_coverage_keys:['surface:a'], material_reopen_evidence:[receiptB], reopen_dependencies:[dep] }, selection, action:actionA, outcome:{status:'completed',material_state_observed:true} });
assert.deepEqual(consumed.consumed_reopen_transition_keys,['surface:b=>surface:a@10->11']);
assert.equal(selectNextResearchAction({ state:consumed, candidates:[actionA] }).mode,'stop','replay must remain closed after successful recheck');

const failed = updateResearchRunState({ state:{ decision_sensitive:true, completed_coverage_keys:['surface:a'], material_reopen_evidence:[receiptB], reopen_dependencies:[dep] }, selection, action:actionA, outcome:{status:'failed',material_state_observed:false} });
assert.deepEqual(failed.consumed_reopen_transition_keys,[],'failed recheck must not consume authorization');
assert.equal(selectNextResearchAction({ state:failed, candidates:[actionA] }).action_id,'recheck-a');

console.log('research state-owned cross-surface reopen validation passed');
