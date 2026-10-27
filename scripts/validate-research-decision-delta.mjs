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

  
// A status downgrade is not conflict resolution while an explicit material
// conflict persists. Evidence-backed receipts must agree on claim and scope.
const conflictedEnvelope = structuredClone(envelopeFixture);
conflictedEnvelope.status = 'Conflicted';
conflictedEnvelope.confidence = { level: 'medium', reason: 'Independent material contradiction is unresolved.' };
conflictedEnvelope.evidence.push({
  ...conflictedEnvelope.evidence[0],
  evidence_id: 'conflict-counter',
  direction: 'contradict',
  pointer: 'independent contradictory observation',
  lineage_id: 'conflict-counter-lineage',
});
conflictedEnvelope.conflicts = [{
  evidence_ids: ['e1', 'conflict-counter'],
  issue: 'Material contradiction about the same scoped claim.',
  state: 'unresolved',
}];
const stillConflicted = structuredClone(conflictedEnvelope);
stillConflicted.status = 'Needs verification';
const resolvedConflict = structuredClone(stillConflicted);
resolvedConflict.conflicts[0].state = 'resolved';
resolvedConflict.conflicts[0].resolution_basis = 'Independent verification resolved the contradiction.';
const silentlyDroppedConflict = structuredClone(stillConflicted);
silentlyDroppedConflict.conflicts = [];
const withdrawnContradiction = structuredClone(silentlyDroppedConflict);
withdrawnContradiction.evidence = withdrawnContradiction.evidence.filter((item) => item.direction !== 'contradict');
const wrongScopeResolution = structuredClone(resolvedConflict);
wrongScopeResolution.scope = { runtime_version: 'different' };
for (const [label, envelope] of [
  ['original unresolved', conflictedEnvelope],
  ['unresolved after status downgrade', stillConflicted],
  ['resolved with basis', resolvedConflict],
  ['conflict record silently removed', silentlyDroppedConflict],
  ['contradiction withdrawn', withdrawnContradiction],
  ['different claim scope', wrongScopeResolution],
]) {
  assert.deepEqual(validateEvidenceEnvelope(envelope), [], label);
}
const conflictDelta = (before, after) => evaluateDecisionDelta({
  action: { expected_delta: 'resolve_conflict' },
  before,
  after,
  observation: { status: 'completed' },
}).realized;
const conflictBefore = { claim_status: 'Conflicted', evidence_envelope: conflictedEnvelope };
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: stillConflicted }), false,
  'downgrading claim status must not hide an unresolved material conflict');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: silentlyDroppedConflict }), false,
  'silently deleting a conflict record while retaining its contradiction is not resolution');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: resolvedConflict }), true,
  'a dispositioned conflict can be resolved even if other uncertainty remains');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: withdrawnContradiction }), false,
  'silently removing the contradiction and conflict is not a documented resolution');
const documentedWithdrawal = structuredClone(withdrawnContradiction);
documentedWithdrawal.evidence.push({ ...conflictedEnvelope.evidence[1], direction: 'context' });
documentedWithdrawal.conflicts = [{
  evidence_ids: ['e1', 'conflict-counter'],
  issue: 'Material contradiction about the same scoped claim.',
  state: 'resolved',
  resolution_basis: 'Independent recheck invalidated the earlier contradiction; retained as context.',
}];
assert.deepEqual(validateEvidenceEnvelope(documentedWithdrawal), []);
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: documentedWithdrawal }), true,
  'a traceable disposition can resolve an invalidated contradiction');
// A new contradiction plus a shared supporting ID cannot erase the original
// counterevidence while claiming that the original dispute was resolved.
const substitutedContradiction = structuredClone(documentedWithdrawal);
substitutedContradiction.evidence = substitutedContradiction.evidence.filter(
  (item) => item.evidence_id !== 'conflict-counter',
);
substitutedContradiction.evidence.push({
  ...conflictedEnvelope.evidence[1],
  evidence_id: 'replacement-counter',
  lineage_id: 'replacement-counter-lineage',
});
substitutedContradiction.conflicts[0].evidence_ids = ['e1', 'replacement-counter'];
assert.deepEqual(validateEvidenceEnvelope(substitutedContradiction), []);
assert.equal(conflictDelta(conflictBefore, {
  claim_status: 'Needs verification',
  evidence_envelope: substitutedContradiction,
}), false, 'a shared support ID cannot disguise a withdrawn original contradiction');

const documentedSubstitution = structuredClone(substitutedContradiction);
documentedSubstitution.evidence.push({ ...conflictedEnvelope.evidence[1], direction: 'context' });
documentedSubstitution.conflicts[0].evidence_ids.push('conflict-counter');
assert.deepEqual(validateEvidenceEnvelope(documentedSubstitution), []);
assert.equal(conflictDelta(conflictBefore, {
  claim_status: 'Needs verification',
  evidence_envelope: documentedSubstitution,
}), true, 'retaining the original contradiction as context preserves a traceable disposition');

const multiCounterConflict = structuredClone(conflictedEnvelope);
multiCounterConflict.evidence.push({
  ...conflictedEnvelope.evidence[1],
  evidence_id: 'second-original-counter',
  lineage_id: 'second-original-counter-lineage',
});
multiCounterConflict.conflicts[0].evidence_ids.push('second-original-counter');
assert.deepEqual(validateEvidenceEnvelope(multiCounterConflict), []);
assert.equal(conflictDelta({
  claim_status: 'Conflicted',
  evidence_envelope: multiCounterConflict,
}, {
  claim_status: 'Needs verification',
  evidence_envelope: documentedWithdrawal,
}), false, 'all original contradictions in one dispute require traceable disposition');

const unrelatedDisposition = structuredClone(documentedWithdrawal);
unrelatedDisposition.conflicts[0].issue = 'Unrelated issue';
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: unrelatedDisposition }), false,
  'a resolved unrelated issue must not clear the original conflict');
const unlinkedDisposition = structuredClone(documentedWithdrawal);
unlinkedDisposition.evidence.forEach((item, index) => { item.evidence_id = `rekeyed-${index}`; });
unlinkedDisposition.conflicts[0].evidence_ids = unlinkedDisposition.evidence.map((item) => item.evidence_id);
assert.deepEqual(validateEvidenceEnvelope(unlinkedDisposition), []);
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: unlinkedDisposition }), false,
  'unlinked evidence rekeys cannot manufacture a traceable conflict resolution');
const twoConflictsBefore = structuredClone(conflictedEnvelope);
twoConflictsBefore.evidence.push({
  ...conflictedEnvelope.evidence[1],
  evidence_id: 'second-counter',
  lineage_id: 'second-counter-lineage',
});
twoConflictsBefore.conflicts.push({
  evidence_ids: ['e1', 'second-counter'],
  issue: 'Material contradiction about the same scoped claim.',
  state: 'unresolved',
});
const oneDispositionAfter = structuredClone(documentedWithdrawal);
assert.deepEqual(validateEvidenceEnvelope(twoConflictsBefore), []);
assert.equal(conflictDelta({ claim_status: 'Conflicted', evidence_envelope: twoConflictsBefore },
  { claim_status: 'Needs verification', evidence_envelope: oneDispositionAfter }), false,
  'one disposition cannot erase two distinct unresolved conflicts');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: wrongScopeResolution }), false,
  'a different claim scope cannot resolve the original conflict');
assert.equal(conflictDelta({ claim_status: 'Conflicted' }, { claim_status: 'Needs verification', evidence_envelope: resolvedConflict }), false,
  'one-sided Envelope state must not silently fall back to a status-only receipt');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Confirmed', evidence_envelope: resolvedConflict }), false,
  'a claim status inconsistent with its Envelope cannot establish resolution');

const rekeyedContradiction = structuredClone(silentlyDroppedConflict);
rekeyedContradiction.evidence[1].evidence_id = 'rekeyed-contradiction';
const relinedContradiction = structuredClone(silentlyDroppedConflict);
relinedContradiction.evidence[1].lineage_id = 'rekeyed-contradiction-lineage';
const newContradiction = structuredClone(withdrawnContradiction);
newContradiction.evidence.push({
  ...conflictedEnvelope.evidence[1],
  evidence_id: 'new-contradiction',
  lineage_id: 'new-contradiction-lineage',
});
const failedContradiction = structuredClone(silentlyDroppedConflict);
failedContradiction.evidence[1].source_class = 'connector_or_api';
failedContradiction.evidence[1].provenance = {
  quality: 'verified',
  source_identity: 'failed connector acquisition',
  provider_execution: 'failed',
};
const navigationContradiction = structuredClone(silentlyDroppedConflict);
navigationContradiction.evidence[1].authority = 'navigation_only';
for (const [label, envelope] of [
  ['rekeyed evidence ID', rekeyedContradiction],
  ['rekeyed lineage ID', relinedContradiction],
  ['new acquired contradiction', newContradiction],
  ['failed acquisition', failedContradiction],
  ['navigation hint', navigationContradiction],
]) {
  assert.deepEqual(validateEvidenceEnvelope(envelope), [], label);
}
for (const [label, envelope] of [
  ['rekeyed evidence ID', rekeyedContradiction],
  ['rekeyed lineage ID', relinedContradiction],
  ['new acquired contradiction', newContradiction],
]) {
  assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: envelope }), false,
    `${label} cannot evade the unresolved acquired contradiction check`);
}
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: failedContradiction }), false,
  'reclassifying a contradiction as failed acquisition requires an explicit conflict disposition');
assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: navigationContradiction }), false,
  'reclassifying a contradiction as a navigation hint requires an explicit conflict disposition');
const documentedFailedAcquisition = structuredClone(failedContradiction);
documentedFailedAcquisition.conflicts = [{
  evidence_ids: ['e1', 'conflict-counter'],
  issue: 'Material contradiction about the same scoped claim.',
  state: 'resolved',
  resolution_basis: 'The prior contradiction was a failed connector acquisition, not acquired negative evidence.',
}];
const documentedNavigationHint = structuredClone(navigationContradiction);
documentedNavigationHint.conflicts = [{
  evidence_ids: ['e1', 'conflict-counter'],
  issue: 'Material contradiction about the same scoped claim.',
  state: 'not_material',
  resolution_basis: 'The prior contradiction was a navigation hint and never acquired substantive evidence.',
}];
for (const [label, envelope] of [
  ['failed acquisition disposition', documentedFailedAcquisition],
  ['navigation hint disposition', documentedNavigationHint],
]) {
  assert.deepEqual(validateEvidenceEnvelope(envelope), [], label);
  assert.equal(conflictDelta(conflictBefore, { claim_status: 'Needs verification', evidence_envelope: envelope }), true,
    `${label} remains a valid documented reclassification`);
}

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
  lineageItem('unknown-auth', 'new-auth-source', 'first_party_authenticated', 'primary', { auth_state: 'confirmed', quality: 'unknown' }),
], 0, 'an authenticated page with unknown provenance quality is not acquired verification');
lineageProgress([
  lineageItem('na-auth', 'new-auth-source', 'first_party_authenticated', 'primary', { auth_state: 'confirmed', quality: 'not_applicable' }),
], 0, 'authenticated provenance cannot be not_applicable for decision progress');
lineageProgress([
  lineageItem('partial-auth', 'new-auth-source', 'first_party_authenticated', 'primary', { auth_state: 'confirmed', quality: 'partial' }),
], 1, 'partial but usable authenticated provenance remains eligible for bounded research progress');
lineageProgress([
  lineageItem('unknown-connector', 'new-connector', 'connector_or_api', 'primary', {
    provider_execution: 'read_executed', quality: 'unknown',
  }),
], 0, 'executed connector with unknown provenance cannot count as verification');
lineageProgress([
  lineageItem('partial-connector', 'new-connector', 'connector_or_api', 'primary', {
    provider_execution: 'read_executed', quality: 'partial',
  }),
], 1, 'executed connector with partial provenance can count as bounded progress');
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

// A secondary, community, or independent-authoritative source with an explicit
// failed provider acquisition is not acquired evidence. Do not apply this
// blanket rule to user-supplied material with unrelated provider metadata.
for (const sourceClass of ['independent_authoritative', 'secondary', 'community']) {
  for (const providerExecution of ['configured_only', 'skipped', 'failed']) {
    const description = `${sourceClass} ${providerExecution} is not acquired evidence`;
    lineageProgress([
      lineageItem(`unavailable-${sourceClass}-${providerExecution}`,
        `lineage-${sourceClass}-${providerExecution}`, sourceClass, 'authoritative_secondary',
        { provider_execution: providerExecution }),
    ], 0, description);
    const falseConfirmation = structuredClone(envelopeFixture);
    falseConfirmation.evidence[0].source_class = sourceClass;
    falseConfirmation.evidence[0].provenance.provider_execution = providerExecution;
    assert.ok(validateEvidenceEnvelope(falseConfirmation).length > 0,
      `${description}: cannot confirm solely from an unavailable read`);
  }
  lineageProgress([
    lineageItem(`available-${sourceClass}`, `lineage-available-${sourceClass}`,
      sourceClass, 'authoritative_secondary', { provider_execution: 'not_applicable' }),
  ], 1, `${sourceClass}: absence of provider metadata does not imply failed acquisition`);
}
lineageProgress([
  lineageItem('user-supplied-with-old-provider-state', 'lineage-user-material',
    'user_supplied', 'primary', { provider_execution: 'failed' }),
], 1, 'user-supplied evidence must not inherit unrelated provider failure');

console.log('research decision-delta control passed');
