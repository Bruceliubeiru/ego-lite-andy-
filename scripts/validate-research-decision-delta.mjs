import assert from 'node:assert/strict';
import { evaluateDecisionDelta, hasDecisionDelta, selectNextResearchAction } from './research-control.mjs';

assert.equal(hasDecisionDelta({ expected_delta: 'resolve_conflict' }), true);
assert.equal(hasDecisionDelta({ expected_delta: 'collect_more_information' }), false);

const useful = { id: 'verify-date', expected_delta: 'resolve_scope', decision_relevance: 'material', scope_fit: 'exact', evidence_novelty: 'same_lineage', breadth: 'bounded', cost: 'medium', risk: 'read_only' };
const generic = { id: 'another-source', decision_relevance: 'decisive', scope_fit: 'exact', evidence_novelty: 'independent', breadth: 'bounded', cost: 'low', risk: 'read_only' };

assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, require_expected_delta: true }, candidates: [generic, useful] }).action_id, 'verify-date');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, require_expected_delta: true }, candidates: [generic] }).mode, 'stop');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true }, candidates: [generic] }).action_id, 'another-source');

assert.deepEqual(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: { scope_status: 'resolved' }, observation: { status: 'completed' } }), { realized: true, reason: 'expected-decision-delta-realized' });
assert.equal(evaluateDecisionDelta({ action: useful, before: {}, after: { scope_status: 'resolved' }, observation: { status: 'completed' } }).realized, false, 'missing baseline scope state must not establish scope resolution');
assert.equal(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation scope state must not establish scope resolution');
assert.deepEqual(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: { scope_status: 'unknown' }, observation: { status: 'completed' } }), { realized: false, reason: 'no-material-decision-delta' });
assert.deepEqual(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: { scope_status: 'resolved' }, observation: { status: 'failed' } }), { realized: false, reason: 'acquisition-not-completed' });

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'resolve_conflict' }, before: { claim_status: 'Conflicted' }, after: { claim_status: 'Confirmed' }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'resolve_conflict' }, before: { claim_status: 'Conflicted' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation claim status must not masquerade as conflict resolution');

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: { provenance_established: false }, after: { provenance_established: true }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: {}, after: { provenance_established: true }, observation: { status: 'completed' } }).realized, false, 'missing baseline provenance state must not establish realized progress');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: { provenance_established: false }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation provenance state must not establish realized progress');

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: { decision: 'A' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation decision must not masquerade as a changed decision');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: {}, after: { decision: 'B' }, observation: { status: 'completed' } }).realized, false, 'an absent baseline decision cannot establish a decision change');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: { decision: 'A' }, after: { decision: 'B' }, observation: { status: 'completed' } }).realized, true);

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 2 }, after: { independent_lineage_count: 2 }, observation: { status: 'completed' } }).realized, false);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: {}, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, false, 'missing baseline lineage count must not be treated as zero realized progress');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 0 }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation lineage count must not establish lineage growth');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 0 }, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, true);

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'untested' }, after: { causal_hypothesis_status: 'falsified' }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: {}, after: { causal_hypothesis_status: 'supported' }, observation: { status: 'completed' } }).realized, false, 'missing baseline causal state must not establish a realized hypothesis test');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'untested' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation causal state must not establish a realized hypothesis test');

console.log('research decision-delta control passed');
