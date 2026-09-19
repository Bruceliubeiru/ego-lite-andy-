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
const TERMINAL_CAUSAL_STATUSES = new Set(['supported', 'falsified']);

function rank(action) {
  return [
    DECISION_RELEVANCE[action.decision_relevance] ?? -1,
    SCOPE_FIT[action.scope_fit] ?? -1,
    NOVELTY[action.evidence_novelty] ?? -1,
    BREADTH[action.breadth] ?? -1,
    COST[action.cost] ?? -1,
  ];
}

function compareRank(a, b) {
  const ar = rank(a);
  const br = rank(b);
  for (let i = 0; i < ar.length; i += 1) {
    if (ar[i] !== br[i]) return br[i] - ar[i];
  }
  return 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isDecisionValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'boolean';
}

const DECISION_DELTA_CONTRACTS = {
  resolve_scope: {
    complete: ({ before, after }) => isNonEmptyString(before?.scope_status) && isNonEmptyString(after?.scope_status),
    realized: ({ before, after }) => before.scope_status !== 'resolved' && after.scope_status === 'resolved',
  },
  resolve_conflict: {
    complete: ({ before, after }) => CLAIM_STATUSES.has(before?.claim_status) && CLAIM_STATUSES.has(after?.claim_status),
    realized: ({ before, after }) => before.claim_status === 'Conflicted' && after.claim_status !== 'Conflicted',
  },
  establish_provenance: {
    complete: ({ before, after }) => typeof before?.provenance_established === 'boolean' && typeof after?.provenance_established === 'boolean',
    realized: ({ before, after }) => before.provenance_established === false && after.provenance_established === true,
  },
  add_independent_lineage: {
    complete: ({ before, after }) => isNonNegativeInteger(before?.independent_lineage_count) && isNonNegativeInteger(after?.independent_lineage_count),
    realized: ({ before, after }) => after.independent_lineage_count > before.independent_lineage_count,
  },
  test_causal_hypothesis: {
    complete: ({ before, after }) => isNonEmptyString(before?.causal_hypothesis_status) && TERMINAL_CAUSAL_STATUSES.has(after?.causal_hypothesis_status),
    realized: ({ before, after }) => before.causal_hypothesis_status !== after.causal_hypothesis_status,
  },
  change_decision: {
    complete: ({ before, after }) => isDecisionValue(before?.decision) && isDecisionValue(after?.decision),
    realized: ({ before, after }) => before.decision !== after.decision,
  },
};

export function hasDecisionDelta(action) {
  return typeof action?.expected_delta === 'string' && EXPECTED_DELTAS.has(action.expected_delta);
}

export function evaluateDecisionDelta({ action, before, after, observation } = {}) {
  if (!hasDecisionDelta(action)) return { realized: false, reason: 'no-valid-expected-delta' };
  if (observation?.status !== 'completed') return { realized: false, reason: 'acquisition-not-completed' };

  const contract = DECISION_DELTA_CONTRACTS[action.expected_delta];
  if (!contract.complete({ before, after })) {
    return { realized: false, reason: 'incomplete-or-invalid-delta-state' };
  }

  const realized = contract.realized({ before, after });
  return {
    realized,
    reason: realized ? 'expected-decision-delta-realized' : 'no-material-decision-delta',
  };
}

export function updateResearchCoverage({ completed = [], action, outcome } = {}) {
  const next = new Set(Array.isArray(completed) ? completed : []);
  if (
    action?.coverage_key &&
    typeof action.coverage_key === 'string' &&
    action.coverage_key.trim() &&
    outcome?.status === 'completed' &&
    outcome?.material_state_observed === true
  ) {
    next.add(action.coverage_key.trim());
  }
  return [...next];
}

export function selectNextResearchAction({ state, candidates = [] }) {
  if (state?.decision_sensitive === false) {
    return { mode: 'stop', action_id: null, reason: 'decision-no-longer-sensitive' };
  }

  const eligible = candidates.filter((action) => {
    if (!action || typeof action.id !== 'string' || !action.id.trim()) return false;
    if (action.decision_relevance === 'none') return false;
    if (action.scope_fit === 'wrong') return false;
    if (action.blocked_on_observation === true) return false;
    if (action.risk !== 'read_only') return false;
    if (state?.require_expected_delta === true && !hasDecisionDelta(action)) return false;
    if (
      action.coverage_key &&
      Array.isArray(state?.completed_coverage_keys) &&
      state.completed_coverage_keys.includes(action.coverage_key) &&
      action.reopened_by_material_evidence !== true
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

  return { mode: 'execute', action_id: selected.id, reason: 'highest-decision-value-safe-read' };
}
