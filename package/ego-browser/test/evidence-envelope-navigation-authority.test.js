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

function makeConnectorEnvelope(providerExecution = "failed") {
  const envelope = makeEnvelope();
  envelope.evidence[0] = {
    ...envelope.evidence[0],
    pointer: "connector acquisition receipt",
    source_class: "connector_or_api",
    authority: "primary",
    specificity: "exact",
    provenance: {
      quality: "unknown",
      source_identity: "connector response",
      provider_execution: providerExecution,
    },
    limitations: ["The connector did not supply verified content."],
  };
  return envelope;
}

test("failed, skipped, or configured-only connector acquisition cannot confirm a claim", () => {
  for (const execution of ["failed", "skipped", "configured_only"]) {
    const envelope = makeConnectorEnvelope(execution);
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unavailable acquisition support/,
      execution,
    );
  }
});

test("blocked or unauthenticated first-party acquisition cannot solely confirm a claim", () => {
  for (const authState of ["blocked", "not_authenticated"]) {
    const envelope = makeConnectorEnvelope("read_executed");
    envelope.evidence[0].source_class = "first_party_authenticated";
    envelope.evidence[0].provenance.auth_state = authState;
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unavailable acquisition support/,
      authState,
    );
  }
});

test("an unavailable acquisition remains valid evidence context for an unconfirmed claim", () => {
  const envelope = makeConnectorEnvelope();
  envelope.status = "Needs verification";
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("independent substantive support can confirm despite another failed acquisition", () => {
  const envelope = makeConnectorEnvelope();
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "official-1",
    lineage_id: "official-page",
    pointer: "verified first-party page",
    source_class: "first_party_public",
    provenance: { quality: "verified", source_identity: "official page" },
    limitations: [],
  });
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("successful connector reads and unrelated user-supplied evidence remain usable", () => {
  const executed = makeConnectorEnvelope("read_executed");
  executed.evidence[0].provenance.quality = "verified";
  assert.deepEqual(validateEvidenceEnvelope(executed), []);

  const userSupplied = makeConnectorEnvelope();
  userSupplied.evidence[0].source_class = "user_supplied";
  assert.deepEqual(validateEvidenceEnvelope(userSupplied), []);
});
