import assert from "node:assert/strict";
import test from "node:test";

import {
  projectEvidenceEnvelopeToLedger,
  validateEvidenceEnvelope,
} from "../../../scripts/evidence-envelope.mjs";

function makeEnvelope() {
  return {
    version: "1.0",
    claim_id: "ledger-text-integrity-regression",
    claim_kind: "observed_fact",
    claim: "Ledger-facing claim text remains inspectable.",
    scope: {},
    status: "Confirmed",
    evidence: [
      {
        evidence_id: "support-1",
        direction: "support",
        pointer: "supporting source",
        lineage_id: "support-lineage",
        source_class: "first_party_public",
        authority: "primary",
        specificity: "exact",
        freshness: "current",
        provenance: {
          quality: "verified",
          source_identity: "supporting source",
        },
        limitations: [],
      },
    ],
    conflicts: [],
    confidence: {
      level: "high",
      reason: "Regression fixture for Ledger projection integrity.",
    },
    decision_impact: "High",
    next_action: "none",
  };
}

test("Evidence Envelope rejects a non-text claim before Ledger projection", () => {
  const envelope = makeEnvelope();
  envelope.claim = { text: "structured claim" };

  const errors = validateEvidenceEnvelope(envelope);
  assert.ok(
    errors.includes("claim must be a non-empty string"),
    `expected claim text error, got: ${errors.join("; ")}`,
  );
  assert.throws(
    () => projectEvidenceEnvelopeToLedger(envelope),
    /claim must be a non-empty string/,
  );
});

test("Evidence Envelope rejects a non-text next action before Ledger projection", () => {
  const envelope = makeEnvelope();
  envelope.next_action = ["verify"];

  const errors = validateEvidenceEnvelope(envelope);
  assert.ok(
    errors.includes("next_action must be a non-empty string"),
    `expected next-action text error, got: ${errors.join("; ")}`,
  );
  assert.throws(
    () => projectEvidenceEnvelopeToLedger(envelope),
    /next_action must be a non-empty string/,
  );
});

test("valid text fields still project unchanged into the Claim Ledger", () => {
  const envelope = makeEnvelope();

  assert.deepEqual(projectEvidenceEnvelopeToLedger(envelope), {
    Claim: "Ledger-facing claim text remains inspectable.",
    Evidence: "supporting source",
    Status: "Confirmed",
    Impact: "High",
    "Next action": "none",
  });
});
