import assert from "node:assert/strict";
import test from "node:test";

import { validateEvidenceEnvelope } from "../../../scripts/evidence-envelope.mjs";

function makeEnvelope() {
  return {
    version: "1.0",
    claim_id: "navigation-authority-regression",
    claim_kind: "observed_fact",
    claim: "A material claim requires substantive support.",
    scope: {},
    status: "Confirmed",
    evidence: [
      {
        evidence_id: "snippet-1",
        direction: "support",
        pointer: "search snippet",
        lineage_id: "snippet-source",
        source_class: "search_snippet",
        authority: "navigation_only",
        specificity: "broad",
        freshness: "current",
        provenance: { quality: "partial", source_identity: "search result" },
        limitations: ["Underlying page not verified."],
      },
    ],
    conflicts: [],
    confidence: { level: "medium", reason: "Only a snippet." },
    decision_impact: "High",
    next_action: "verify",
  };
}

test("reject navigation-only confirmation", () => {
  const errors = validateEvidenceEnvelope(makeEnvelope());
  assert.match(errors.join(" "), /navigation_only support/);
});

test("reject inflated snippet authority", () => {
  const envelope = makeEnvelope();
  envelope.status = "Needs verification";
  envelope.evidence[0].authority = "primary";
  const errors = validateEvidenceEnvelope(envelope);
  assert.match(errors.join(" "), /navigation_only authority/);
});

test("allow navigation hints for unconfirmed claims", () => {
  const envelope = makeEnvelope();
  envelope.status = "Needs verification";
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("allow confirmed claims with independent substantive support", () => {
  const envelope = makeEnvelope();
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "official-1",
    pointer: "verified first-party page",
    lineage_id: "official-source",
    source_class: "first_party_public",
    authority: "primary",
    specificity: "exact",
    provenance: { quality: "verified", source_identity: "official page" },
    limitations: [],
  });
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});
