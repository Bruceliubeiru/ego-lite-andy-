import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEvidenceEnvelope } from '../../../scripts/evidence-envelope.mjs';

function baseEnvelope(limitations) {
  return {
    version: '1.0',
    claim_id: 'claim-limitation-shape',
    claim_kind: 'observed_fact',
    claim: 'Structured limitation payloads must not enter Evidence Envelope evidence.',
    scope: {},
    status: 'Needs verification',
    evidence: [
      {
        evidence_id: 'e1',
        direction: 'context',
        pointer: 'source A',
        lineage_id: 'source-a',
        source_class: 'secondary',
        authority: 'secondary',
        specificity: 'broad',
        freshness: 'dated',
        provenance: {
          quality: 'verified',
          source_identity: 'source A',
        },
        limitations,
      },
    ],
    conflicts: [],
    confidence: {
      level: 'low',
      reason: 'Shape validation only.',
    },
    decision_impact: 'Low',
    next_action: 'verify',
  };
}

test('Evidence Envelope rejects structured limitation payloads', () => {
  const errors = validateEvidenceEnvelope(baseEnvelope([{ code: 'opaque-provider-detail' }]));
  assert.ok(errors.includes('evidence[0].limitations[0] must be a string'));
});

test('Evidence Envelope accepts string limitations', () => {
  assert.deepEqual(validateEvidenceEnvelope(baseEnvelope(['bounded source limitation'])), []);
});
