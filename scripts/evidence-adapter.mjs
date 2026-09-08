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

const AUTHORITY_VALUES = new Set([
  'primary',
  'authoritative_secondary',
  'secondary',
  'community',
  'navigation_only',
]);
const SPECIFICITY_VALUES = new Set(['exact', 'scoped', 'broad', 'unknown']);
const FRESHNESS_VALUES = new Set(['current', 'dated', 'stale_or_unknown']);
const PROVENANCE_QUALITY_VALUES = new Set(['verified', 'partial', 'unknown', 'not_applicable']);

const ALLOWED_PROVENANCE_FIELDS = [
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

const PROVENANCE_ENUM_VALUES = {
  auth_state: new Set(['confirmed', 'not_authenticated', 'blocked', 'unknown', 'not_applicable']),
  challenge_state: new Set(['none', 'present', 'resolved_by_user', 'unknown', 'not_applicable']),
  provider_execution: new Set(['read_executed', 'configured_only', 'skipped', 'failed', 'not_applicable']),
};

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredEnum(value, label, allowed) {
  const normalized = requiredString(value, label);
  if (!allowed.has(normalized)) {
    throw new Error(`${label} has unsupported value: ${normalized}`);
  }
  return normalized;
}

function boundedProvenanceString(value, field, enforceEnvelopeEnum = false) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`provenance.${field} must be a non-empty string marker`);
  }
  const allowed = PROVENANCE_ENUM_VALUES[field];
  if (enforceEnvelopeEnum && allowed && !allowed.has(value)) {
    throw new Error(`provenance.${field} has unsupported value: ${value}`);
  }
  return value;
}

function pickBoundedProvenance(observation, enforceEnvelopeEnums = false) {
  const provenance = {};
  for (const field of ALLOWED_PROVENANCE_FIELDS) {
    const value = boundedProvenanceString(
      observation.provenance?.[field],
      field,
      enforceEnvelopeEnums,
    );
    if (value !== null) provenance[field] = value;
  }
  return provenance;
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
    // Limitation provenance is intentionally only field/shape bounded. It may
    // preserve runtime/provider diagnostic markers that are not legal Evidence
    // Envelope enum values, because the limitation itself is not evidence.
    const provenance = pickBoundedProvenance(observation, false);
    return {
      evidence: null,
      limitation: {
        adapter,
        outcome,
        reason,
        pointer: typeof observation.pointer === 'string' ? observation.pointer : null,
        ...(Object.keys(provenance).length > 0 ? { provenance } : {}),
      },
    };
  }

  if (!SUCCESS_OUTCOMES.has(outcome)) {
    throw new Error(`unsupported acquisition outcome: ${outcome}`);
  }

  // A provider/runtime may surface transport-level success while also returning
  // an application/tool error. Preserve that contradiction as an acquisition
  // failure signal instead of turning it into evidence. Emitters should map an
  // explicit current-call error into result_error; absence of this field is not
  // treated as proof that no hidden error exists.
  if (typeof observation.result_error === 'string' && observation.result_error.trim() !== '') {
    throw new Error('success observation cannot contain result_error');
  }

  const evidence_id = requiredString(observation.evidence_id, 'evidence_id');
  const pointer = requiredString(observation.pointer, 'pointer');
  const lineage_id = requiredString(observation.lineage_id, 'lineage_id');
  const source_identity = requiredString(observation.source_identity, 'source_identity');
  const direction = requiredString(observation.direction, 'direction');
  const authority = requiredEnum(observation.authority, 'authority', AUTHORITY_VALUES);
  const specificity = requiredEnum(observation.specificity, 'specificity', SPECIFICITY_VALUES);
  const freshness = requiredEnum(observation.freshness, 'freshness', FRESHNESS_VALUES);

  if (!['support', 'contradict', 'context'].includes(direction)) {
    throw new Error(`unsupported direction: ${direction}`);
  }

  if (adapter === 'search_snippet' && authority !== 'navigation_only') {
    throw new Error('search_snippet must remain navigation_only evidence');
  }

  const provenance = {
    quality: requiredEnum(
      observation.provenance?.quality ?? 'unknown',
      'provenance.quality',
      PROVENANCE_QUALITY_VALUES,
    ),
    source_identity,
    ...pickBoundedProvenance(observation, true),
  };

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
