import assert from "node:assert/strict";
import test from "node:test";

import { validateEvidenceEnvelope } from "../../../scripts/evidence-envelope.mjs";

function confirmedEnvelopeWithConflictState(state) {
  return {
    version: "1.0",
    claim_id: "conflict-state-validation",
    claim_kind: "observed_fact",
    claim:
      "A confirmed claim must not bypass material-conflict semantics through an unknown state.",
    scope: {},
    status: "Confirmed",
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
        evidence_ids: ["e1", "e2"],
        issue: "Material disagreement",
        state,
      },
    ],
    confidence: { level: "high", reason: "Deliberately adversarial fixture." },
    decision_impact: "High",
    next_action: "verify",
  };
}

test(
  "unknown conflict state fails closed instead of bypassing Confirmed conflict checks",
  () => {
    const errors = validateEvidenceEnvelope(
      confirmedEnvelopeWithConflictState("provider_specific_state"),
    );
    assert.ok(
      errors.includes(
        "conflicts[0].state has unsupported value: provider_specific_state",
      ),
    );
  },
);

test("known unresolved conflict still blocks Confirmed status", () => {
  const errors = validateEvidenceEnvelope(
    confirmedEnvelopeWithConflictState("unresolved"),
  );
  assert.ok(
    errors.includes(
      "Confirmed claim cannot retain an unresolved material conflict",
    ),
  );
});
