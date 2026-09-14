import assert from "node:assert/strict";
import test from "node:test";

import { validateEvidenceEnvelope } from "../../../scripts/evidence-envelope.mjs";

function envelopeWithConflict(evidenceIds) {
  return {
    version: "1.0",
    claim_id: "conflict-distinctness",
    claim_kind: "observed_fact",
    claim: "A material conflict must be grounded in distinct evidence items.",
    scope: {},
    status: "Conflicted",
    evidence: [
      {
        evidence_id: "e1",
        direction: "support",
        pointer: "source A",
        lineage_id: "source-a",
        source_class: "first_party_public",
        authority: "primary",
        specificity: "exact",
        freshness: "current",
        provenance: { quality: "verified", source_identity: "source A" },
        limitations: [],
      },
      {
        evidence_id: "e2",
        direction: "contradict",
        pointer: "source B",
        lineage_id: "source-b",
        source_class: "first_party_public",
        authority: "primary",
        specificity: "exact",
        freshness: "current",
        provenance: { quality: "verified", source_identity: "source B" },
        limitations: [],
      },
    ],
    conflicts: [
      {
        evidence_ids: evidenceIds,
        issue: "Material disagreement",
        state: "unresolved",
      },
    ],
    confidence: { level: "medium", reason: "Conflicting current evidence." },
    decision_impact: "High",
    next_action: "verify",
  };
}

test("one evidence item repeated twice cannot manufacture a conflict", () => {
  const errors = validateEvidenceEnvelope(envelopeWithConflict(["e1", "e1"]));
  assert.ok(
    errors.includes(
      "conflicts[0].evidence_ids must contain at least two distinct evidence IDs",
    ),
  );
});

test("two distinct evidence items remain a valid conflict basis", () => {
  assert.deepEqual(
    validateEvidenceEnvelope(envelopeWithConflict(["e1", "e2"])),
    [],
  );
});

test("resolved conflict requires a textual resolution basis", () => {
  const envelope = envelopeWithConflict(["e1", "e2"]);
  envelope.status = "High probability";
  envelope.conflicts[0] = {
    ...envelope.conflicts[0],
    state: "resolved",
    resolution_basis: { code: "provider-specific-resolution" },
  };

  const errors = validateEvidenceEnvelope(envelope);
  assert.ok(
    errors.includes(
      "conflicts[0] resolved conflict requires a non-empty string resolution_basis",
    ),
  );
});
