import assert from 'node:assert/strict';
import { hasDecisionDelta, selectNextResearchAction } from './research-control.mjs';

assert.equal(hasDecisionDelta({ expected_delta: 'resolve_conflict' }), true);
assert.equal(hasDecisionDelta({ expected_delta: 'collect_more_information' }), false);

const useful = { id: 'verify-date', expected_delta: 'resolve_scope', decision_relevance: 'material', scope_fit: 'exact', evidence_novelty: 'same_lineage', breadth: 'bounded', cost: 'medium', risk: 'read_only' };
const generic = { id: 'another-source', decision_relevance: 'decisive', scope_fit: 'exact', evidence_novelty: 'independent', breadth: 'bounded', cost: 'low', risk: 'read_only' };

assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, require_expected_delta: true }, candidates: [generic, useful] }).action_id, 'verify-date');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true, require_expected_delta: true }, candidates: [generic] }).mode, 'stop');
assert.equal(selectNextResearchAction({ state: { decision_sensitive: true }, candidates: [generic] }).action_id, 'another-source');

console.log('research decision-delta gate passed');
