const TOP_LEVEL_REQUIRED = [
  'version',
  'claim_id',
  'claim_kind',
  'claim',
  'scope',
  'status',
  'evidence',
  'conflicts',
  'confidence',
  'decision_impact',
  'next_action',
];

const EVIDENCE_REQUIRED = [
  'evidence_id',
  'direction',
  'pointer',
  'lineage_id',
  'source_class',
  'authority',
  'specificity',
  'freshness',
  'provenance',
  'limitations',
];

const CLAIM_KINDS = new Set(['observed_fact', 'inference', 'causal', 'estimate', 'recommendation']);
const CLAIM_STATUSES = new Set(['Confirmed', 'High probability', 'Needs verification', 'Conflicted']);
const EVIDENCE_DIRECTIONS = new Set(['support', 'contradict', 'context']);
const SOURCE_CLASSES = new Set([
  'first_party_public',
  'first_party_authenticated',
  'user_supplied',
  'connector_or_api',
  'independent_authoritative',
  'secondary',
  'community',
  'search_snippet',
]);
const EVIDENCE_AUTHORITIES = new Set([
  'primary',
  'authoritative_secondary',
  'secondary',
  'community',
  'navigation_only',
]);
const EVIDENCE_SPECIFICITIES = new Set(['exact', 'scoped', 'broad', 'unknown']);
const EVIDENCE_FRESHNESS = new Set(['current', 'dated', 'stale_or_unknown']);
const DECISION_IMPACTS = new Set(['High', 'Medium', 'Low']);
const CONFLICT_STATES = new Set(['unresolved', 'resolved', 'not_material']);
const PROVENANCE_QUALITIES = new Set(['verified', 'partial', 'unknown', 'not_applicable']);
const PROVENANCE_ENUMS = {
  auth_state: new Set(['confirmed', 'not_authenticated', 'blocked', 'unknown', 'not_applicable']),
  challenge_state: new Set(['none', 'present', 'resolved_by_user', 'unknown', 'not_applicable']),
  provider_execution: new Set(['read_executed', 'configured_only', 'skipped', 'failed', 'not_applicable']),
};
const CONFIDENCE_LEVELS = new Set(['high', 'medium', 'low', 'blocked']);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function pushMissing(errors, object, fields, prefix) {
  for (const field of fields) {
    if (!hasOwn(object, field)) errors.push(`${prefix} missing required field: ${field}`);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate the small set of Evidence Engine semantic invariants that can be
 * checked mechanically without pretending to judge whether external evidence
 * is factually correct. This deliberately complements, rather than replaces,
 * the research-router evidence/conflict gates.
 */
export function validateEvidenceEnvelope(envelope) {
  const errors = [];

  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return ['envelope must be an object'];
  }

  pushMissing(errors, envelope, TOP_LEVEL_REQUIRED, 'envelope');
  if (errors.length) return errors;

  if (envelope.version !== '1.0') errors.push(`unsupported envelope version: ${envelope.version}`);
  if (!CLAIM_KINDS.has(envelope.claim_kind)) {
    errors.push(`claim_kind has unsupported value: ${envelope.claim_kind}`);
  }
  if (!CLAIM_STATUSES.has(envelope.status)) {
    errors.push(`status has unsupported value: ${envelope.status}`);
  }
  if (!DECISION_IMPACTS.has(envelope.decision_impact)) {
    errors.push(`decision_impact has unsupported value: ${envelope.decision_impact}`);
  }
  if (!envelope.scope || typeof envelope.scope !== 'object' || Array.isArray(envelope.scope)) {
    errors.push('scope must be an object');
  }
  if (!Array.isArray(envelope.evidence)) errors.push('evidence must be an array');
  if (!Array.isArray(envelope.conflicts)) errors.push('conflicts must be an array');
  if (!envelope.confidence || typeof envelope.confidence !== 'object' || Array.isArray(envelope.confidence)) {
    errors.push('confidence must be an object');
  } else {
    if (!CONFIDENCE_LEVELS.has(envelope.confidence.level)) {
      errors.push(`confidence.level has unsupported value: ${envelope.confidence.level}`);
    }
    if (!isNonEmptyString(envelope.confidence.reason)) {
      errors.push('confidence.reason must be a non-empty string');
    }
    if (envelope.status === 'Confirmed' && envelope.confidence.level === 'blocked') {
      errors.push('Confirmed claim cannot have blocked confidence');
    }
  }
  if (errors.length) return errors;

  const evidenceIds = new Set();
  let supportingEvidence = 0;

  envelope.evidence.forEach((item, index) => {
    const prefix = `evidence[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    pushMissing(errors, item, EVIDENCE_REQUIRED, prefix);

    if (!isNonEmptyString(item.evidence_id)) {
      errors.push(`${prefix}.evidence_id must be a non-empty string`);
    } else if (evidenceIds.has(item.evidence_id)) {
      errors.push(`duplicate evidence_id: ${item.evidence_id}`);
    } else {
      evidenceIds.add(item.evidence_id);
    }

    if (!isNonEmptyString(item.pointer)) {
      errors.push(`${prefix}.pointer must be a non-empty string`);
    }

    if (!isNonEmptyString(item.lineage_id)) {
      errors.push(`${prefix}.lineage_id must be a non-empty string`);
    }

    if (!EVIDENCE_DIRECTIONS.has(item.direction)) {
      errors.push(`${prefix}.direction has unsupported value: ${item.direction}`);
    }
    if (item.direction === 'support') supportingEvidence += 1;

    const boundedAssessmentFields = [
      ['source_class', SOURCE_CLASSES],
      ['authority', EVIDENCE_AUTHORITIES],
      ['specificity', EVIDENCE_SPECIFICITIES],
      ['freshness', EVIDENCE_FRESHNESS],
    ];
    for (const [field, allowedValues] of boundedAssessmentFields) {
      if (!allowedValues.has(item[field])) {
        errors.push(`${prefix}.${field} has unsupported value: ${item[field]}`);
      }
    }

    if (!item.provenance || typeof item.provenance !== 'object' || Array.isArray(item.provenance)) {
      errors.push(`${prefix}.provenance must be an object`);
    } else {
      if (!hasOwn(item.provenance, 'quality')) {
        errors.push(`${prefix}.provenance missing required field: quality`);
      } else if (!PROVENANCE_QUALITIES.has(item.provenance.quality)) {
        errors.push(`${prefix}.provenance.quality has unsupported value: ${item.provenance.quality}`);
      }
      if (!isNonEmptyString(item.provenance.source_identity)) {
        errors.push(`${prefix}.provenance.source_identity must be a non-empty string`);
      }
      for (const [field, allowedValues] of Object.entries(PROVENANCE_ENUMS)) {
        if (hasOwn(item.provenance, field) && !allowedValues.has(item.provenance[field])) {
          errors.push(`${prefix}.provenance.${field} has unsupported value: ${item.provenance[field]}`);
        }
      }
    }

    if (!Array.isArray(item.limitations)) {
      errors.push(`${prefix}.limitations must be an array`);
    } else {
      item.limitations.forEach((limitation, limitationIndex) => {
        if (typeof limitation !== 'string') {
          errors.push(`${prefix}.limitations[${limitationIndex}] must be a string`);
        }
      });
    }
  });

  let unresolvedConflicts = 0;
  envelope.conflicts.forEach((conflict, index) => {
    const prefix = `conflicts[${index}]`;
    if (!conflict || typeof conflict !== 'object' || Array.isArray(conflict)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    if (!Array.isArray(conflict.evidence_ids) || conflict.evidence_ids.length < 2) {
      errors.push(`${prefix}.evidence_ids must contain at least two evidence IDs`);
    } else {
      const distinctEvidenceIds = new Set(conflict.evidence_ids);
      if (distinctEvidenceIds.size < 2) {
        errors.push(`${prefix}.evidence_ids must contain at least two distinct evidence IDs`);
      }
      for (const evidenceId of conflict.evidence_ids) {
        if (!evidenceIds.has(evidenceId)) {
          errors.push(`${prefix} references unknown evidence_id: ${evidenceId}`);
        }
      }
    }

    if (!conflict.issue) errors.push(`${prefix} missing issue`);
    if (!CONFLICT_STATES.has(conflict.state)) {
      errors.push(`${prefix}.state has unsupported value: ${conflict.state}`);
    }
    if (conflict.state === 'unresolved') unresolvedConflicts += 1;
    if (conflict.state === 'resolved' && !isNonEmptyString(conflict.resolution_basis)) {
      errors.push(`${prefix} resolved conflict requires a non-empty string resolution_basis`);
    }
  });

  // These are intentionally narrow consistency checks. They do not infer
  // confidence from evidence count or force every uncertainty into a conflict.
  if (envelope.status === 'Confirmed') {
    if (supportingEvidence === 0) errors.push('Confirmed claim requires at least one supporting evidence item');
    if (unresolvedConflicts > 0) errors.push('Confirmed claim cannot retain an unresolved material conflict');
  }

  if (envelope.status === 'Conflicted' && unresolvedConflicts === 0) {
    errors.push('Conflicted claim requires at least one unresolved conflict');
  }

  return errors;
}

export function projectEvidenceEnvelopeToLedger(envelope) {
  const errors = validateEvidenceEnvelope(envelope);
  if (errors.length) {
    throw new Error(`cannot project invalid Evidence Envelope: ${errors.join('; ')}`);
  }

  const pointers = [];
  const seenLineages = new Set();
  for (const item of envelope.evidence) {
    if (seenLineages.has(item.lineage_id)) continue;
    seenLineages.add(item.lineage_id);
    pointers.push(item.pointer);
  }

  return {
    Claim: envelope.claim,
    Evidence: pointers.join(' + '),
    Status: envelope.status,
    Impact: envelope.decision_impact,
    'Next action': envelope.next_action,
  };
}

export function countIndependentEvidenceLineages(envelope, direction = null) {
  const lineages = new Set();
  for (const item of envelope?.evidence ?? []) {
    if (direction && item.direction !== direction) continue;
    if (isNonEmptyString(item.lineage_id)) lineages.add(item.lineage_id);
  }
  return lineages.size;
}
