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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function pushMissing(errors, object, fields, prefix) {
  for (const field of fields) {
    if (!hasOwn(object, field)) errors.push(`${prefix} missing required field: ${field}`);
  }
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
  if (!Array.isArray(envelope.evidence)) errors.push('evidence must be an array');
  if (!Array.isArray(envelope.conflicts)) errors.push('conflicts must be an array');
  if (errors.length) return errors;

  const evidenceIds = new Set();
  const lineages = new Set();
  let supportingEvidence = 0;

  envelope.evidence.forEach((item, index) => {
    const prefix = `evidence[${index}]`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    pushMissing(errors, item, EVIDENCE_REQUIRED, prefix);
    if (!item.evidence_id) return;

    if (evidenceIds.has(item.evidence_id)) {
      errors.push(`duplicate evidence_id: ${item.evidence_id}`);
    } else {
      evidenceIds.add(item.evidence_id);
    }

    if (item.lineage_id) lineages.add(item.lineage_id);
    if (item.direction === 'support') supportingEvidence += 1;

    if (!item.provenance || typeof item.provenance !== 'object' || Array.isArray(item.provenance)) {
      errors.push(`${prefix}.provenance must be an object`);
    } else {
      if (!item.provenance.quality) errors.push(`${prefix}.provenance missing required field: quality`);
      if (!item.provenance.source_identity) {
        errors.push(`${prefix}.provenance missing required field: source_identity`);
      }
    }

    if (!Array.isArray(item.limitations)) errors.push(`${prefix}.limitations must be an array`);
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
      for (const evidenceId of conflict.evidence_ids) {
        if (!evidenceIds.has(evidenceId)) {
          errors.push(`${prefix} references unknown evidence_id: ${evidenceId}`);
        }
      }
    }

    if (!conflict.issue) errors.push(`${prefix} missing issue`);
    if (!conflict.state) errors.push(`${prefix} missing state`);
    if (conflict.state === 'unresolved') unresolvedConflicts += 1;
    if (conflict.state === 'resolved' && !conflict.resolution_basis) {
      errors.push(`${prefix} resolved conflict requires resolution_basis`);
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
    if (item.lineage_id) lineages.add(item.lineage_id);
  }
  return lineages.size;
}
