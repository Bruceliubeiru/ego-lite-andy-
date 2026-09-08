const SUCCESS_OUTCOMES = new Set(['success']);
const NON_EVIDENCE_OUTCOMES = new Set(['failed', 'blocked', 'skipped', 'not_executed']);

const SOURCE_CLASS_BY_ADAPTER = {
  public_page: 'first_party_public',
  authenticated_page: 'first_party_authenticated',
  connector_api: 'connector_or_api',
  repository: 'connector_or_api',
  user_supplied: 'user_supplied',
  search_snippet: 'search_snippet',
  secondary_source: 'secondary',
  community_source: 'community',
};

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

/**
 * Convert one bounded adapter observation into an Evidence Envelope evidence
 * item, or into a limitation when the acquisition path did not produce usable
 * evidence. This function normalizes structure only; it does not judge truth,
 * infer confidence, or upgrade source authority.
 */
export function normalizeEvidenceObservation(observation) {
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new Error('observation must be an object');
  }

  const adapter = requiredString(observation.adapter, 'adapter');
  const outcome = requiredString(observation.outcome, 'outcome');

  if (!Object.prototype.hasOwnProperty.call(SOURCE_CLASS_BY_ADAPTER, adapter)) {
    throw new Error(`unsupported adapter: ${adapter}`);
  }

  if (NON_EVIDENCE_OUTCOMES.has(outcome)) {
    const reason = requiredString(observation.failure_reason ?? observation.limitations?.[0], 'failure_reason');
    return {
      evidence: null,
      limitation: {
        adapter,
        outcome,
        reason,
        pointer: typeof observation.pointer === 'string' ? observation.pointer : null,
      },
    };
  }

  if (!SUCCESS_OUTCOMES.has(outcome)) {
    throw new Error(`unsupported acquisition outcome: ${outcome}`);
  }

  const evidence_id = requiredString(observation.evidence_id, 'evidence_id');
  const pointer = requiredString(observation.pointer, 'pointer');
  const lineage_id = requiredString(observation.lineage_id, 'lineage_id');
  const source_identity = requiredString(observation.source_identity, 'source_identity');
  const direction = requiredString(observation.direction, 'direction');
  const authority = requiredString(observation.authority, 'authority');
  const specificity = requiredString(observation.specificity, 'specificity');
  const freshness = requiredString(observation.freshness, 'freshness');

  if (!['support', 'contradict', 'context'].includes(direction)) {
    throw new Error(`unsupported direction: ${direction}`);
  }

  if (adapter === 'search_snippet' && authority !== 'navigation_only') {
    throw new Error('search_snippet must remain navigation_only evidence');
  }

  const provenance = {
    quality: observation.provenance?.quality ?? 'unknown',
    source_identity,
  };

  const allowedProvenanceFields = [
    'observed_at',
    'task_space',
    'profile',
    'account_marker',
    'page_url',
    'document_marker',
    'frame_marker',
    'session_marker',
    'region',
    'auth_state',
    'challenge_state',
    'provider_execution',
  ];
  for (const field of allowedProvenanceFields) {
    const value = observation.provenance?.[field];
    if (value !== undefined && value !== null && value !== '') provenance[field] = value;
  }

  if (adapter === 'authenticated_page') {
    if (provenance.auth_state !== 'confirmed') {
      throw new Error('authenticated_page requires provenance.auth_state=confirmed');
    }
    if (specificity === 'exact' && !provenance.account_marker) {
      throw new Error('exact authenticated_page evidence requires provenance.account_marker');
    }
  }

  if (adapter === 'connector_api' || adapter === 'repository') {
    const execution = provenance.provider_execution;
    if (execution !== 'read_executed') {
      throw new Error(`${adapter} success requires provenance.provider_execution=read_executed`);
    }
  }

  return {
    evidence: {
      evidence_id,
      direction,
      pointer,
      lineage_id,
      source_class: SOURCE_CLASS_BY_ADAPTER[adapter],
      authority,
      specificity,
      freshness,
      provenance,
      limitations: Array.isArray(observation.limitations) ? observation.limitations : [],
    },
    limitation: null,
  };
}
