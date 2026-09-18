const DECISION_RELEVANCE = { none: 0, material: 1, decisive: 2 };
const SCOPE_FIT = { wrong: 0, partial: 1, exact: 2 };
const NOVELTY = { none: 0, same_lineage: 1, independent: 2 };
const BREADTH = { broad: 0, bounded: 1 };
const COST = { high: 0, medium: 1, low: 2 };

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
