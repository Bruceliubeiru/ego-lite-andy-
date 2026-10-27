import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countDecisionRelevantEvidenceLineages, validateEvidenceEnvelope } from './evidence-envelope.mjs';
import { deriveMaterialReopenAuthorizations, evaluateDecisionDelta, hasDecisionDelta, selectNextResearchAction } from './research-control.mjs';

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
assert.equal(evaluateDecisionDelta({ action: useful, before: { scope_status: 'invalid' }, after: { scope_status: 'resolved' }, observation: { status: 'completed' } }).realized, false, 'unknown baseline scope enum must not establish scope resolution');
assert.deepEqual(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: { scope_status: 'unknown' }, observation: { status: 'completed' } }), { realized: false, reason: 'no-material-decision-delta' });
assert.deepEqual(evaluateDecisionDelta({ action: useful, before: { scope_status: 'unknown' }, after: { scope_status: 'resolved' }, observation: { status: 'failed' } }), { realized: false, reason: 'acquisition-not-completed' });

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'resolve_conflict' }, before: { claim_status: 'Conflicted' }, after: { claim_status: 'Confirmed' }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'resolve_conflict' }, before: { claim_status: 'Conflicted' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation claim status must not masquerade as conflict resolution');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'resolve_conflict' }, before: { claim_status: 'Conflicted' }, after: { claim_status: 'invalid' }, observation: { status: 'completed' } }).realized, false, 'unknown claim status must not masquerade as conflict resolution');

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: { provenance_established: false }, after: { provenance_established: true }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: {}, after: { provenance_established: true }, observation: { status: 'completed' } }).realized, false, 'missing baseline provenance state must not establish realized progress');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: { provenance_established: false }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation provenance state must not establish realized progress');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'establish_provenance' }, before: { provenance_established: 'false' }, after: { provenance_established: true }, observation: { status: 'completed' } }).realized, false, 'string provenance state must not be coerced into a valid transition');

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: { decision: 'A' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation decision must not masquerade as a changed decision');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: {}, after: { decision: 'B' }, observation: { status: 'completed' } }).realized, false, 'an absent baseline decision cannot establish a decision change');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'change_decision' }, before: { decision: 'A' }, after: { decision: 'B' }, observation: { status: 'completed' } }).realized, true);

const decisionDeltaAction = { id: 'recheck-decision', coverage_key: 'policy:decision', expected_delta: 'change_decision' };
const sameStructuredDecision = {
  before: { revision: 7, decision: { recommendation: 'hold', conditions: { region: 'HK', cost: 100 } } },
  after: { revision: 8, decision: { conditions: { cost: 100, region: 'HK' }, recommendation: 'hold' } },
  observation: { status: 'completed' },
};
assert.equal(evaluateDecisionDelta({ action: decisionDeltaAction, ...sameStructuredDecision }).realized, false, 'reconstructed equal decisions must not count as a material change');
assert.equal(evaluateDecisionDelta({ action: decisionDeltaAction, before: { decision: ['hold', { reason: 'risk' }] }, after: { decision: ['hold', { reason: 'risk' }] }, observation: { status: 'completed' } }).realized, false, 'equivalent array decisions must not count as a change');
assert.equal(evaluateDecisionDelta({ action: decisionDeltaAction, before: { decision: { recommendation: 'hold', conditions: { cost: 100 } } }, after: { decision: { recommendation: 'hold', conditions: { cost: 101 } } }, observation: { status: 'completed' } }).realized, true, 'nested material decision changes must still be detected');
const unchangedDecisionReceipt = { coverage_key: 'policy:decision', action: decisionDeltaAction, ...sameStructuredDecision, material_state_observed: true };
assert.deepEqual(deriveMaterialReopenAuthorizations({ evidence: [unchangedDecisionReceipt] }), [], 'equal structured decisions must not authorize a covered-surface reopen');
assert.deepEqual(deriveMaterialReopenAuthorizations({ evidence: [{ ...unchangedDecisionReceipt, after: { revision: 8, decision: { recommendation: 'reject', conditions: { region: 'HK', cost: 100 } } } }] }), [{ coverage_key: 'policy:decision', transition_key: 'policy:decision@7->8', after_revision: 8 }], 'a genuinely changed structured decision may authorize the same-surface reopen');


assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 2 }, after: { independent_lineage_count: 2 }, observation: { status: 'completed' } }).realized, false);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: {}, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, false, 'missing baseline lineage count must not be treated as zero realized progress');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 0 }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation lineage count must not establish lineage growth');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 0 }, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: '0' }, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, false, 'string lineage counts must not be coerced into numeric evidence growth');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: -1 }, after: { independent_lineage_count: 0 }, observation: { status: 'completed' } }).realized, false, 'negative lineage counts are semantically invalid');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'add_independent_lineage' }, before: { independent_lineage_count: 0.5 }, after: { independent_lineage_count: 1 }, observation: { status: 'completed' } }).realized, false, 'fractional lineage counts are semantically invalid');

assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'untested' }, after: { causal_hypothesis_status: 'falsified' }, observation: { status: 'completed' } }).realized, true);
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: {}, after: { causal_hypothesis_status: 'supported' }, observation: { status: 'completed' } }).realized, false, 'missing baseline causal state must not establish a realized hypothesis test');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'untested' }, after: {}, observation: { status: 'completed' } }).realized, false, 'missing post-observation causal state must not establish a realized hypothesis test');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'invalid' }, after: { causal_hypothesis_status: 'supported' }, observation: { status: 'completed' } }).realized, false, 'unknown causal baseline enum must not establish a realized hypothesis test');
assert.equal(evaluateDecisionDelta({ action: { expected_delta: 'test_causal_hypothesis' }, before: { causal_hypothesis_status: 'supported' }, after: { causal_hypothesis_status: 'falsified' }, observation: { status: 'completed' } }).realized, false, 'already-tested causal states must not be counted as a fresh test');

assert.equal(
  evaluateDecisionDelta({
    action: { expected_delta: 'add_independent_lineage' },
    before: { independent_lineage_count: 1 },
    after: { independent_lineage_count: Number.MAX_SAFE_INTEGER + 1 },
    observation: { status: 'completed' },
  }).realized,
  false,
  'unsafe integer lineage counts cannot establish verified independent evidence growth',
);


// Envelope-backed lineage progress must not trust a raw count inflated by
// failed reads, navigation hints, context-only records, or duplicate sources.
const envelopeFixture = JSON.parse(readFileSync(
  new URL('../skills/research-router/evals/evidence-envelope-fixtures.json', import.meta.url),
  'utf8',
)).valid[0].envelope;
const emptyEnvelope = structuredClone(envelopeFixture);
emptyEnvelope.status = 'Needs verification';
emptyEnvelope.confidence = { level: 'low', reason: 'No acquired evidence' };
emptyEnvelope.evidence = [];
const lineageItem = (id, lineageId, sourceClass, authority, provenance, direction = 'support') => ({
  ...envelopeFixture.evidence[0],
  evidence_id: id,
  lineage_id: lineageId,
  pointer: id,
  direction,
  source_class: sourceClass,
  authority,
  provenance: { quality: 'verified', source_identity: id, ...provenance },
  limitations: [],
});
const lineageProgress = (items, expectedCount, description) => {
  const current = structuredClone(emptyEnvelope);
  current.evidence = items;
  assert.deepEqual(validateEvidenceEnvelope(current), [], `${description}: envelope remains valid`);
  assert.equal(countDecisionRelevantEvidenceLineages(current), expectedCount, description);
  assert.equal(evaluateDecisionDelta({
    action: { expected_delta: 'add_independent_lineage' },
    before: { independent_lineage_count: 0, evidence_envelope: emptyEnvelope },
    after: { independent_lineage_count: 999, evidence_envelope: current },
    observation: { status: 'completed' },
  }).realized, expectedCount > 0, description);
  return current;
};
lineageProgress([
  lineageItem('failed', 'new-source', 'connector_or_api', 'primary', { provider_execution: 'failed' }),
], 0, 'failed-only connector receipt is not independent verification');
lineageProgress([
  lineageItem('blocked', 'new-source', 'first_party_authenticated', 'primary', { auth_state: 'blocked' }),
], 0, 'blocked authenticated read is not independent verification');
lineageProgress([
  lineageItem('snippet', 'new-source', 'search_snippet', 'navigation_only', {}),
], 0, 'navigation-only snippet is not independent verification');
lineageProgress([
  lineageItem('context', 'new-source', 'first_party_public', 'primary', {}, 'context'),
], 0, 'context-only source is not claim verification');
const recoveredEnvelope = lineageProgress([
  lineageItem('failed', 'same-source', 'connector_or_api', 'primary', { provider_execution: 'failed' }),
  lineageItem('recovered', 'same-source', 'connector_or_api', 'primary', { provider_execution: 'read_executed' }),
  lineageItem('duplicate', 'same-source', 'connector_or_api', 'primary', { provider_execution: 'read_executed' }),
], 1, 'recovered same-lineage source counts once');
lineageProgress([
  lineageItem('contradiction', 'new-source', 'first_party_public', 'primary', {}, 'contradict'),
], 1, 'acquired contradictory evidence can add independent verification');
const changedScopeEnvelope = structuredClone(recoveredEnvelope);
changedScopeEnvelope.scope = { ...changedScopeEnvelope.scope, different_region: 'other' };
assert.equal(evaluateDecisionDelta({
  action: { expected_delta: 'add_independent_lineage' },
  before: { evidence_envelope: emptyEnvelope },
  after: { evidence_envelope: changedScopeEnvelope },
  observation: { status: 'completed' },
}).realized, false, 'a different claim scope cannot establish same-claim lineage growth');
assert.equal(evaluateDecisionDelta({
  action: { expected_delta: 'add_independent_lineage' },
  before: { independent_lineage_count: 0, evidence_envelope: emptyEnvelope },
  after: { independent_lineage_count: 999 },
  observation: { status: 'completed' },
}).realized, false, 'a missing after-envelope must not silently fall back to raw counts');


// A new acquired independent lineage is progress even when a stale lineage
// drops out of the after snapshot, leaving the aggregate count unchanged.
const beforeReplacement = structuredClone(emptyEnvelope);
beforeReplacement.evidence = [
  lineageItem('source-a', 'lineage-a', 'first_party_public', 'primary', {}),
  lineageItem('source-b', 'lineage-b', 'first_party_public', 'primary', {}),
];
const afterReplacement = structuredClone(emptyEnvelope);
afterReplacement.evidence = [
  lineageItem('source-a', 'lineage-a', 'first_party_public', 'primary', {}),
  lineageItem('source-c', 'lineage-c', 'first_party_public', 'primary', {}),
];
assert.deepEqual(validateEvidenceEnvelope(beforeReplacement), []);
assert.deepEqual(validateEvidenceEnvelope(afterReplacement), []);
assert.equal(countDecisionRelevantEvidenceLineages(beforeReplacement), 2);
assert.equal(countDecisionRelevantEvidenceLineages(afterReplacement), 2);
const replacementDelta = (before, after) => evaluateDecisionDelta({
  action: { expected_delta: 'add_independent_lineage' },
  before: { evidence_envelope: before },
  after: { evidence_envelope: after },
  observation: { status: 'completed' },
}).realized;
assert.equal(replacementDelta(beforeReplacement, afterReplacement), true,
  'a newly acquired independent lineage is not hidden by an unchanged total count');
const reorderedExisting = structuredClone(beforeReplacement);
reorderedExisting.evidence.reverse();
assert.equal(replacementDelta(beforeReplacement, reorderedExisting), false,
  'reordering already acquired lineages is not new verification');
const lostExisting = structuredClone(beforeReplacement);
lostExisting.evidence.pop();
assert.equal(replacementDelta(beforeReplacement, lostExisting), false,
  'losing a lineage without acquiring another is not progress');
const failedBeforeRecovery = structuredClone(emptyEnvelope);
failedBeforeRecovery.evidence = [
  lineageItem('failed-before', 'lineage-recovery', 'connector_or_api', 'primary', { provider_execution: 'failed' }),
];
const acquiredAfterRecovery = structuredClone(failedBeforeRecovery);
acquiredAfterRecovery.evidence.push(
  lineageItem('recovered-after', 'lineage-recovery', 'connector_or_api', 'primary', { provider_execution: 'read_executed' }),
);
assert.deepEqual(validateEvidenceEnvelope(failedBeforeRecovery), []);
assert.deepEqual(validateEvidenceEnvelope(acquiredAfterRecovery), []);
assert.equal(replacementDelta(failedBeforeRecovery, acquiredAfterRecovery), true,
  'a failed prior acquisition does not prevent later successful evidence from counting');

console.log('research decision-delta control passed');
