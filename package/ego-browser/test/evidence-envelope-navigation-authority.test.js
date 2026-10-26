import assert from "node:assert/strict";
import test from "node:test";

import { validateEvidenceEnvelope } from "../../../scripts/evidence-envelope.mjs";

function makeEnvelope() {
  return {
    version: "1.0",
    claim_id: "navigation-authority-regression",
    claim_kind: "observed_fact",
    claim: "A material claim requires substantive support before confirmation.",
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
    confidence: { level: "medium", reason: "Only a search result was observed." },
    decision_impact: "High",
    next_action: "verify",
  };
}

test("navigation-only support cannot confirm a consequential claim", () => {
  assert.ok(
    validateEvidenceEnvelope(makeEnvelope()).includes(
      "Confirmed claim cannot rely solely on navigation_only support",
    ),
  );
});

test("search snippets cannot claim primary authority in raw envelopes", () => {
  const envelope = makeEnvelope();
  envelope.status = "Needs verification";
  envelope.evidence[0].authority = "primary";
  assert.ok(
    validateEvidenceEnvelope(envelope).includes(
      "evidence[0].search_snippet must have navigation_only authority",
    ),
  );
});

test("navigation-only evidence remains valid for unconfirmed claims", () => {
  const envelope = makeEnvelope();
  envelope.status = "Needs verification";
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("confirmed claims may include snippets alongside substantive support", () => {
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
