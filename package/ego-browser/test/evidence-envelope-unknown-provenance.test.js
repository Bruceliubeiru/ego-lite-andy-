import assert from "node:assert/strict";
import test from "node:test";

import {
  countDecisionRelevantEvidenceLineages,
  validateEvidenceEnvelope,
} from "../../../scripts/evidence-envelope.mjs";

function evidence(id, sourceClass, quality = "verified") {
  return {
    evidence_id: id,
    direction: "support",
    pointer: `observed source ${id}`,
    lineage_id: `lineage-${id}`,
    source_class: sourceClass,
    authority: sourceClass === "secondary" ? "secondary" : "primary",
    specificity: "exact",
    freshness: "current",
    provenance: {
      quality,
      source_identity: `observed source ${id}`,
    },
    limitations: [],
  };
}

function envelope(items) {
  return {
    version: "1.0",
    claim_id: "unknown-provenance-qualification",
    claim_kind: "observed_fact",
    claim: "The scoped material claim is supported by acquired evidence.",
    scope: { target: "bounded research subject" },
    status: "Confirmed",
    evidence: items,
    conflicts: [],
    confidence: {
      level: "medium",
      reason: "Fixture tests provenance qualification only.",
    },
    decision_impact: "High",
    next_action: "none",
  };
}

test("unknown provenance cannot confirm", () => {
  for (const sourceClass of [
    "first_party_public",
    "user_supplied",
    "secondary",
  ]) {
    for (const quality of ["unknown", "not_applicable"]) {
      const candidate = envelope([evidence("uncertain", sourceClass, quality)]);
      const errors = validateEvidenceEnvelope(candidate);
      assert.ok(
        errors.some((error) => error.includes("unknown source provenance")),
        `${sourceClass}/${quality} must not confirm: ${errors.join("; ")}`,
      );
      assert.equal(
        countDecisionRelevantEvidenceLineages(candidate),
        0,
        `${sourceClass}/${quality} must not count as acquired verification`,
      );
    }
  }
});

test("verified evidence survives unknown sibling", () => {
  const candidate = envelope([
    evidence("uncertain", "first_party_public", "unknown"),
    evidence("verified", "first_party_public", "verified"),
  ]);
  assert.deepEqual(validateEvidenceEnvelope(candidate), []);
  assert.equal(countDecisionRelevantEvidenceLineages(candidate), 1);
});

test("partial provenance and failed reads", () => {
  const partial = envelope([evidence("partial", "user_supplied", "partial")]);
  assert.deepEqual(validateEvidenceEnvelope(partial), []);
  assert.equal(countDecisionRelevantEvidenceLineages(partial), 1);

  const failed = envelope([
    evidence("failed", "first_party_public", "verified"),
  ]);
  failed.evidence[0].provenance.provider_execution = "failed";
  assert.ok(validateEvidenceEnvelope(failed).length > 0);
  assert.equal(countDecisionRelevantEvidenceLineages(failed), 0);
});
