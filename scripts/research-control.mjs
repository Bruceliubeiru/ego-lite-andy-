import { isDeepStrictEqual } from 'node:util';
import { decisionRelevantEvidenceSourceKey, groupDecisionRelevantEvidenceItems, isDecisionRelevantEvidenceItem, validateEvidenceEnvelope } from './evidence-envelope.mjs';

const DECISION_RELEVANCE = { none: 0, material: 1, decisive: 2 };
const SCOPE_FIT = { wrong: 0, partial: 1, exact: 2 };
const NOVELTY = { none: 0, same_lineage: 1, independent: 2 };
const BREADTH = { broad: 0, bounded: 1 };
const COST = { high: 0, medium: 1, low: 2 };
const EXPECTED_DELTAS = new Set([
  'resolve_scope',
  'resolve_conflict',
  'establish_provenance',
  'add_independent_lineage',
  'test_causal_hypothesis',
  'change_decision',
]);
const CLAIM_STATUSES = new Set(['Confirmed', 'High probability', 'Needs verification', 'Conflicted']);
const SCOPE_STATUSES = new Set(['unknown', 'partial', 'resolved']);
const CAUSAL_HYPOTHESIS_STATUSES = new Set(['untested', 'supported', 'falsified']);

function rank(action) {
  return [
    DECISION_RELEVANCE[action.decision_relevance],
    SCOPE_FIT[action.scope_fit],
    NOVELTY[action.evidence_novelty],
    BREADTH[action.breadth],
    COST[action.cost],
  ];
}

function hasValidRankMetadata(action) {
  return (
    Object.hasOwn(DECISION_RELEVANCE, action?.decision_relevance) &&
    Object.hasOwn(SCOPE_FIT, action?.scope_fit) &&
    Object.hasOwn(NOVELTY, action?.evidence_novelty) &&
    Object.hasOwn(BREADTH, action?.breadth) &&
    Object.hasOwn(COST, action?.cost)
  );
}

function compareRank(a, b) {
  const ar = rank(a);
  const br = rank(b);
  for (let i = 0; i < ar.length; i += 1) {
    if (ar[i] !== br[i]) return br[i] - ar[i];
  }
  return 0;
}

function isKnownValue(value) {
  return value !== undefined && value !== null;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function canonicalCoverageKey(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim();
  return key || null;
}

function materialTransitionKey(receipt) {
  const coverageKey = canonicalCoverageKey(receipt?.coverage_key);
  const producingCoverageKey = canonicalCoverageKey(receipt?.action?.coverage_key);
  const beforeRevision = receipt?.before?.revision;
  const afterRevision = receipt?.after?.revision;
  if (
    !coverageKey ||
    coverageKey !== producingCoverageKey ||
    !isNonNegativeInteger(beforeRevision) ||
    !isNonNegativeInteger(afterRevision) ||
    afterRevision !== beforeRevision + 1
  ) {
    return null;
  }
  return `${coverageKey}@${beforeRevision}->${afterRevision}`;
}

export function hasDecisionDelta(action) {
  return typeof action?.expected_delta === 'string' && EXPECTED_DELTAS.has(action.expected_delta);
}


function hasEnvelopeSnapshot(state) {
  return state !== null && typeof state === 'object' && Object.hasOwn(state, 'evidence_envelope');
}

function hasResolvedConflictDelta(before, after) {
  if (
    before?.claim_status !== 'Conflicted' ||
    !CLAIM_STATUSES.has(after?.claim_status) ||
    after.claim_status === 'Conflicted'
  ) return false;

  const hasBefore = hasEnvelopeSnapshot(before);
  const hasAfter = hasEnvelopeSnapshot(after);
  // Preserve legacy status-only receipts; when a claim-level Envelope is
  // supplied, require matching, independently represented conflict state.
  if (!hasBefore && !hasAfter) return true;
  if (!hasBefore || !hasAfter) return false;
  const previous = before.evidence_envelope;
  const current = after.evidence_envelope;
  if (validateEvidenceEnvelope(previous).length || validateEvidenceEnvelope(current).length) return false;
  if (
    previous.claim_id !== current.claim_id ||
    previous.claim_kind !== current.claim_kind ||
    previous.claim !== current.claim ||
    !isDeepStrictEqual(previous.scope, current.scope) ||
    previous.status !== before.claim_status ||
    current.status !== after.claim_status
  ) return false;
  const unresolvedBefore = previous.conflicts.filter((conflict) => conflict.state === 'unresolved');
  if (
    unresolvedBefore.length === 0 ||
    current.conflicts.some((conflict) => conflict.state === 'unresolved')
  ) return false;
  // Dropping the old conflict and its evidence is not a verified resolution.
  // Require an explicit, traceable disposition for *each* prior conflict.
  // One new disposition cannot silently clear multiple old conflicts.
  const resolvedAfter = current.conflicts.filter(
    (conflict) => conflict.state === 'resolved' || conflict.state === 'not_material',
  );
  const usedDispositions = new Set();
  const previousEvidenceById = new Map(previous.evidence.map((item) => [item.evidence_id, item]));
  for (const prior of unresolvedBefore) {
    // Retain every original contradictory source in the disposition trail.
    // Sharing only a support ID cannot document a withdrawn contradiction.
    const priorContradictions = prior.evidence_ids.filter(
      (id) => previousEvidenceById.get(id)?.direction === 'contradict',
    );
    const match = resolvedAfter.findIndex(
      (candidate, index) =>
        !usedDispositions.has(index) &&
        candidate.issue === prior.issue &&
        (priorContradictions.length > 0
          ? priorContradictions.every((id) => candidate.evidence_ids.includes(id))
          : candidate.evidence_ids.some((id) => prior.evidence_ids.includes(id))),
    );
    if (match === -1) return false;
    usedDispositions.add(match);
  }
  // A still-acquired contradiction requires an explicit disposition, even
  // when its local evidence ID changes between independent snapshots.
  const dispositionedIds = new Set(
    current.conflicts
      .filter((conflict) => conflict.state === 'resolved' || conflict.state === 'not_material')
      .flatMap((conflict) => conflict.evidence_ids),
  );
  return current.evidence.every((item) =>
    item.direction !== 'contradict' ||
    !isDecisionRelevantEvidenceItem(item) ||
    dispositionedIds.has(item.evidence_id)
  );
}

function hasIndependentLineageDelta(before, after) {
  const hasBefore = hasEnvelopeSnapshot(before);
  const hasAfter = hasEnvelopeSnapshot(after);
  if (hasBefore || hasAfter) {
    if (!hasBefore || !hasAfter) return false;
    const previous = before.evidence_envelope;
    const current = after.evidence_envelope;
    if (validateEvidenceEnvelope(previous).length || validateEvidenceEnvelope(current).length) return false;
    if (
      previous.claim_id !== current.claim_id ||
      previous.claim_kind !== current.claim_kind ||
      previous.claim !== current.claim ||
      !isDeepStrictEqual(previous.scope, current.scope)
    ) return false;
    const previousItems = previous.evidence.filter(isDecisionRelevantEvidenceItem);
    const previousLineages = new Set(previousItems.map((item) => item.lineage_id));
    const previousSources = new Set(previousItems.map(decisionRelevantEvidenceSourceKey));
    const previousEvidenceIds = new Set(previousItems.map((item) => item.evidence_id));
    // A new label is not an independent source if another current item
    // bridges it to a previously acquired lineage or source identity.
    return groupDecisionRelevantEvidenceItems(current).some((group) =>
      group.every((item) =>
        !previousLineages.has(item.lineage_id) &&
        !previousSources.has(decisionRelevantEvidenceSourceKey(item)) &&
        !previousEvidenceIds.has(item.evidence_id)
      )
    );
  }
  // Legacy count-only receipts remain supported but do not prove provenance.
  return (
    isNonNegativeInteger(before?.independent_lineage_count) &&
    isNonNegativeInteger(after?.independent_lineage_count) &&
    after.independent_lineage_count > before.independent_lineage_count
  );
}

export function evaluateDecisionDelta({ action, before, after, observation } = {}) {
  if (!hasDecisionDelta(action)) return { realized: false, reason: 'no-valid-expected-delta' };
  if (observation?.status !== 'completed') return { realized: false, reason: 'acquisition-not-completed' };

  const changed = {
    resolve_scope:
      SCOPE_STATUSES.has(before?.scope_status) &&
      SCOPE_STATUSES.has(after?.scope_status) &&
      before.scope_status !== 'resolved' &&
      after.scope_status === 'resolved',
    resolve_conflict: hasResolvedConflictDelta(before, after),
    establish_provenance:
      typeof before?.provenance_established === 'boolean' &&
      typeof after?.provenance_established === 'boolean' &&
      before.provenance_established === false &&
      after.provenance_established === true,
    add_independent_lineage:
      action.expected_delta === 'add_independent_lineage' && hasIndependentLineageDelta(before, after),
    test_causal_hypothesis:
      CAUSAL_HYPOTHESIS_STATUSES.has(before?.causal_hypothesis_status) &&
      CAUSAL_HYPOTHESIS_STATUSES.has(after?.causal_hypothesis_status) &&
      before.causal_hypothesis_status === 'untested' &&
      ['supported', 'falsified'].includes(after.causal_hypothesis_status),
    change_decision:
      isKnownValue(before?.decision) &&
      isKnownValue(after?.decision) &&
      !isDeepStrictEqual(before.decision, after.decision),
  };

  return {
    realized: changed[action.expected_delta] === true,
    reason: changed[action.expected_delta] === true ? 'expected-decision-delta-realized' : 'no-material-decision-delta',
  };
}

export function deriveMaterialReopenAuthorizations({ evidence = [], consumed = [] } = {}) {
  const consumedKeys = new Set(
    (Array.isArray(consumed) ? consumed : [])
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const authorizations = new Map();

  for (const receipt of Array.isArray(evidence) ? evidence : []) {
    const transitionKey = materialTransitionKey(receipt);
    if (!transitionKey || receipt?.material_state_observed !== true) continue;

    const delta = evaluateDecisionDelta({
      action: receipt?.action,
      before: receipt?.before,
      after: receipt?.after,
      observation: receipt?.observation,
    });
    if (!delta.realized) continue;

    const coverageKey = canonicalCoverageKey(receipt.coverage_key);
    const current = authorizations.get(coverageKey);
    if (!current || receipt.after.revision > current.after_revision) {
      authorizations.set(coverageKey, {
        coverage_key: coverageKey,
        transition_key: transitionKey,
        after_revision: receipt.after.revision,
      });
    }
  }

  return [...authorizations.values()].filter(
    (authorization) => !consumedKeys.has(authorization.transition_key),
  );
}

export function deriveMaterialReopenCoverageKeys({ evidence = [], consumed = [] } = {}) {
  return deriveMaterialReopenAuthorizations({ evidence, consumed }).map((authorization) => authorization.coverage_key);
}

export function updateResearchCoverage({ completed = [], action, outcome } = {}) {
  const next = new Set(
    (Array.isArray(completed) ? completed : [])
      .map(canonicalCoverageKey)
      .filter(Boolean),
  );
  const coverageKey = canonicalCoverageKey(action?.coverage_key);
  if (
    coverageKey &&
    outcome?.status === 'completed' &&
    outcome?.material_state_observed === true
  ) {
    next.add(coverageKey);
  }
  return [...next];
}

export function updateResearchRunState({ state = {}, selection, action, outcome } = {}) {
  // Only the selected, read-only action may mark a research surface covered.
  // A mismatched/stale execution receipt is not evidence of that read.
  const matchedRead =
    selection?.mode === 'execute' &&
    selection?.action_id === action?.id &&
    action?.risk === 'read_only';
  const completedCoverageKeys = updateResearchCoverage({
    completed: state?.completed_coverage_keys,
    action: matchedRead ? action : null,
    outcome: matchedRead ? outcome : null,
  });
  const consumed = new Set(
    (Array.isArray(state?.consumed_reopen_transition_keys) ? state.consumed_reopen_transition_keys : [])
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const actionCoverageKey = canonicalCoverageKey(action?.coverage_key);
  const currentAuthorization = actionCoverageKey
    ? new Map(
        deriveMaterialReopenAuthorizations({
          evidence: state?.material_reopen_evidence,
          consumed: state?.consumed_reopen_transition_keys,
        }).map((authorization) => [authorization.coverage_key, authorization]),
      ).get(actionCoverageKey)
    : null;

  if (
    matchedRead &&
    currentAuthorization &&
    selection?.reopen_transition_key === currentAuthorization.transition_key &&
    outcome?.status === 'completed' &&
    outcome?.material_state_observed === true
  ) {
    consumed.add(currentAuthorization.transition_key);
  }

  return {
    ...state,
    completed_coverage_keys: completedCoverageKeys,
    consumed_reopen_transition_keys: [...consumed],
  };
}

export function selectNextResearchAction({ state, candidates = [] }) {
  if (state?.decision_sensitive === false) {
    return { mode: 'stop', action_id: null, reason: 'decision-no-longer-sensitive' };
  }

  const completedCoverageKeys = new Set(
    (Array.isArray(state?.completed_coverage_keys) ? state.completed_coverage_keys : [])
      .map(canonicalCoverageKey)
      .filter(Boolean),
  );
  const materialReopenAuthorizations = new Map(
    deriveMaterialReopenAuthorizations({
      evidence: state?.material_reopen_evidence,
      consumed: state?.consumed_reopen_transition_keys,
    }).map((authorization) => [authorization.coverage_key, authorization]),
  );

  const eligible = candidates.filter((action) => {
    if (!action || typeof action.id !== 'string' || !action.id.trim()) return false;
    if (!hasValidRankMetadata(action)) return false;
    if (action.decision_relevance === 'none') return false;
    if (action.scope_fit === 'wrong') return false;
    if (action.blocked_on_observation === true) return false;
    if (action.risk !== 'read_only') return false;
    if (state?.require_expected_delta === true && !hasDecisionDelta(action)) return false;
    const coverageKey = canonicalCoverageKey(action.coverage_key);
    if (
      coverageKey &&
      completedCoverageKeys.has(coverageKey) &&
      !materialReopenAuthorizations.has(coverageKey)
    ) {
      return false;
    }
    return true;
  });

  if (eligible.length === 0) {
    return {
      mode: 'stop',
      action_id: null,
      reason: 'no-safe-decision-relevant-bounded-action',
    };
  }

  const ranked = eligible.map((action, index) => ({ action, index }));
  ranked.sort((left, right) => compareRank(left.action, right.action) || left.index - right.index);
  const selected = ranked[0].action;
  const coverageKey = canonicalCoverageKey(selected.coverage_key);
  const reopenAuthorization =
    coverageKey && completedCoverageKeys.has(coverageKey)
      ? materialReopenAuthorizations.get(coverageKey)
      : null;

  return {
    mode: 'execute',
    action_id: selected.id,
    reason: 'highest-decision-value-safe-read',
    ...(reopenAuthorization ? {
      reopen_coverage_key: reopenAuthorization.coverage_key,
      reopen_transition_key: reopenAuthorization.transition_key,
    } : {}),
  };
}
