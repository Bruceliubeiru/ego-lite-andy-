import assert from "node:assert/strict";
import test from "node:test";

import { validateEvidenceEnvelope } from "../../../scripts/evidence-envelope.mjs";

function makeEvidence(evidence_id, direction, pointer) {
  return {
    evidence_id,
    direction,
    pointer,
    lineage_id: evidence_id,
    source_class: "first_party_public",
    authority: "primary",
    specificity: "exact",
    freshness: "current",
    provenance: {
      quality: "verified",
      source_identity: pointer,
    },
    limitations: [],
  };
}

function makeConfirmedEnvelope(conflicts = []) {
  return {
    version: "1.0",
    claim_id: "confirmed-contradiction-regression",
    claim_kind: "observed_fact",
    claim:
      "A confirmed claim must not silently ignore evidence marked contradictory.",
    scope: {},
    status: "Confirmed",
    evidence: [
      makeEvidence("support-1", "support", "supporting source"),
      makeEvidence("contradict-1", "contradict", "contradicting source"),
    ],
    conflicts,
    confidence: {
      level: "high",
      reason: "Regression fixture for conflict disposition semantics.",
    },
    decision_impact: "High",
    next_action: "none",
  };
}

test("Confirmed claims reject contradictory evidence with no explicit disposition", () => {
  const errors = validateEvidenceEnvelope(makeConfirmedEnvelope());
  assert.ok(
    errors.includes(
      "Confirmed claim has undispositioned contradictory evidence: contradict-1",
    ),
    `expected undispositioned contradiction error, got: ${errors.join("; ")}`,
  );
});

test("Confirmed claims allow contradictory evidence after an explicit resolved disposition", () => {
  const envelope = makeConfirmedEnvelope([
    {
      evidence_ids: ["support-1", "contradict-1"],
      issue: "The two sources differ at the same claim boundary.",
      state: "resolved",
      resolution_basis:
        "The supporting source supersedes the contradictory source at the exact scope.",
    },
  ]);

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("not-material conflict dispositions require an explicit rationale", () => {
  const envelope = makeConfirmedEnvelope([
    {
      evidence_ids: ["support-1", "contradict-1"],
      issue: "The contradictory source is outside the decision-relevant scope.",
      state: "not_material",
    },
  ]);

  const errors = validateEvidenceEnvelope(envelope);
  assert.ok(
    errors.includes(
      "conflicts[0] not_material conflict requires a non-empty string resolution_basis",
    ),
    `expected not-material rationale error, got: ${errors.join("; ")}`,
  );
});

test("Confirmed claims allow contradictory evidence explicitly judged not material with rationale", () => {
  const envelope = makeConfirmedEnvelope([
    {
      evidence_ids: ["support-1", "contradict-1"],
      issue: "The contradictory source is outside the decision-relevant scope.",
      state: "not_material",
      resolution_basis:
        "The contradictory source applies to a different plan and cannot change this scoped claim.",
    },
  ]);

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("navigation-only hint cannot veto verified support", () => {
  const envelope = makeConfirmedEnvelope();
  Object.assign(envelope.evidence[1], {
    source_class: "search_snippet",
    authority: "navigation_only",
    provenance: { quality: "partial", source_identity: "search preview" },
    limitations: ["The underlying page has not been opened."],
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("navigation-only public pointer cannot veto verified support", () => {
  const envelope = makeConfirmedEnvelope();
  envelope.evidence[1].authority = "navigation_only";

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("unresolved conflict still vetoes despite navigation-only hint", () => {
  const envelope = makeConfirmedEnvelope([
    {
      evidence_ids: ["support-1", "contradict-1"],
      issue: "A possible discrepancy still needs investigation.",
      state: "unresolved",
    },
  ]);
  envelope.evidence[1].source_class = "search_snippet";
  envelope.evidence[1].authority = "navigation_only";

  const errors = validateEvidenceEnvelope(envelope);
  assert.ok(
    errors.includes(
      "Confirmed claim cannot retain an unresolved material conflict",
    ),
    `expected unresolved conflict veto, got: ${errors.join("; ")}`,
  );
});
