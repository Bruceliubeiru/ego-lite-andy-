import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEvidenceEnvelope } from '../../../scripts/evidence-envelope.mjs';

function makeEnvelope() {
  return {
    version: '1.0',
    claim_id: 'audit-identity-regression',
    claim_kind: 'observed_fact',
    claim: 'Evidence Envelope audit identity remains inspectable.',
    scope: {},
    status: 'Conflicted',
    evidence: [
      {
        evidence_id: 'support-1',
        direction: 'support',
        pointer: 'source A',
        lineage_id: 'lineage-a',
        source_class: 'secondary',
        authority: 'secondary',
        specificity: 'broad',
        freshness: 'dated',
        provenance: { quality: 'verified', source_identity: 'source A' },
        limitations: [],
      },
      {
        evidence_id: 'counter-1',
        direction: 'contradict',
        pointer: 'source B',
        lineage_id: 'lineage-b',
        source_class: 'secondary',
        authority: 'secondary',
        specificity: 'broad',
        freshness: 'dated',
        provenance: { quality: 'verified', source_identity: 'source B' },
        limitations: [],
      },
    ],
    conflicts: [
      {
        evidence_ids: ['support-1', 'counter-1'],
        issue: 'Material disagreement remains unresolved.',
        state: 'unresolved',
      },
    ],
    confidence: { level: 'low', reason: 'Regression fixture.' },
    decision_impact: 'Medium',
    next_action: 'verify',
  };
}

test('Evidence Envelope rejects a structured claim identity', () => {
  const envelope = makeEnvelope();
  envelope.claim_id = { opaque: 'claim-1' };

  assert.ok(validateEvidenceEnvelope(envelope).includes('claim_id must be a non-empty string'));
});

test('Evidence Envelope rejects a structured conflict issue', () => {
  const envelope = makeEnvelope();
  envelope.conflicts[0].issue = { opaque: 'material disagreement' };

  assert.ok(
    validateEvidenceEnvelope(envelope).includes('conflicts[0].issue must be a non-empty string'),
  );
});

test('valid audit identity text remains accepted', () => {
  assert.deepEqual(validateEvidenceEnvelope(makeEnvelope()), []);
});
