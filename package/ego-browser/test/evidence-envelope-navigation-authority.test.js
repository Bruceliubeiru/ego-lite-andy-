import assert from "node:assert/strict";
import test from "node:test";

import {
  decisionRelevantEvidenceLineageIds,
  validateEvidenceEnvelope,
} from "../../../scripts/evidence-envelope.mjs";

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

test("connector confirmation requires positive read-executed provenance", () => {
  for (const execution of [undefined, "not_applicable"]) {
    const envelope = makeConnectorEnvelope("read_executed");
    if (execution === undefined) {
      delete envelope.evidence[0].provenance.provider_execution;
    } else {
      envelope.evidence[0].provenance.provider_execution = execution;
    }
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unavailable acquisition support/,
      String(execution),
    );
  }
});

test("authenticated confirmation requires a positively confirmed auth state", () => {
  for (const authState of [undefined, "unknown", "not_applicable"]) {
    const envelope = makeConnectorEnvelope("read_executed");
    envelope.evidence[0].source_class = "first_party_authenticated";
    if (authState !== undefined) {
      envelope.evidence[0].provenance.auth_state = authState;
    }
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unavailable acquisition support/,
      String(authState),
    );
  }
});

test("authenticated confirmation cannot ignore an explicit failed provider execution", () => {
  const envelope = makeConnectorEnvelope("failed");
  envelope.evidence[0].source_class = "first_party_authenticated";
  envelope.evidence[0].provenance.auth_state = "confirmed";
  assert.match(
    validateEvidenceEnvelope(envelope).join(" "),
    /unavailable acquisition support/,
  );
});

test("unknown or inapplicable authenticated provenance cannot solely confirm a claim", () => {
  for (const quality of ["unknown", "not_applicable"]) {
    const envelope = makeConnectorEnvelope("read_executed");
    envelope.evidence[0].source_class = "first_party_authenticated";
    envelope.evidence[0].provenance.auth_state = "confirmed";
    envelope.evidence[0].provenance.quality = quality;
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unknown authenticated provenance/,
      quality,
    );
  }
});

test("partial authenticated provenance remains eligible when auth is confirmed", () => {
  const envelope = makeConnectorEnvelope("read_executed");
  envelope.evidence[0].source_class = "first_party_authenticated";
  envelope.evidence[0].provenance.auth_state = "confirmed";
  envelope.evidence[0].provenance.quality = "partial";
  envelope.evidence[0].limitations = [];
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
});

test("unknown connector provenance cannot confirm or count progress", () => {
  for (const quality of ["unknown", "not_applicable"]) {
    const envelope = makeConnectorEnvelope("read_executed");
    envelope.evidence[0].provenance.quality = quality;
    assert.match(
      validateEvidenceEnvelope(envelope).join(" "),
      /unknown connector provenance/,
    );
    assert.deepEqual(decisionRelevantEvidenceLineageIds(envelope), []);
  }
});

test("partial connector provenance remains usable after a read", () => {
  const envelope = makeConnectorEnvelope("read_executed");
  envelope.evidence[0].provenance.quality = "partial";
  envelope.evidence[0].limitations = [];
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.deepEqual(decisionRelevantEvidenceLineageIds(envelope), [
    "snippet-source",
  ]);
});

test("unknown connector contradiction cannot veto verified support", () => {
  const envelope = makeConnectorEnvelope("read_executed");
  envelope.evidence[0].direction = "contradict";
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "official-1",
    pointer: "verified official page",
    lineage_id: "official-page",
    direction: "support",
    source_class: "first_party_public",
    provenance: { quality: "verified", source_identity: "official page" },
    limitations: [],
  });
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.deepEqual(decisionRelevantEvidenceLineageIds(envelope), [
    "official-page",
  ]);
  envelope.evidence[0].provenance.quality = "verified";
  assert.match(
    validateEvidenceEnvelope(envelope).join(" "),
    /undispositioned contradictory evidence/,
  );
});

test("verified same-lineage recovery remains usable", () => {
  const envelope = makeConnectorEnvelope("read_executed");
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "verified-2",
    pointer: "verified read",
    provenance: {
      ...envelope.evidence[0].provenance,
      quality: "verified",
    },
    limitations: [],
  });
  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.deepEqual(decisionRelevantEvidenceLineageIds(envelope), [
    "snippet-source",
  ]);
});

test("positive execution and independent public support remain valid", () => {
  const connector = makeConnectorEnvelope("read_executed");
  connector.evidence[0].provenance.quality = "verified";
  assert.deepEqual(validateEvidenceEnvelope(connector), []);

  const authenticated = makeConnectorEnvelope("read_executed");
  authenticated.evidence[0].source_class = "first_party_authenticated";
  authenticated.evidence[0].provenance.auth_state = "confirmed";
  authenticated.evidence[0].provenance.quality = "verified";
  authenticated.evidence[0].limitations = [];
  assert.deepEqual(validateEvidenceEnvelope(authenticated), []);

  const mixed = makeConnectorEnvelope("not_applicable");
  mixed.evidence.push({
    ...mixed.evidence[0],
    evidence_id: "official-independent",
    lineage_id: "official-independent",
    pointer: "verified first-party public page",
    source_class: "first_party_public",
    provenance: {
      quality: "verified",
      source_identity: "official public page",
    },
    limitations: [],
  });
  assert.deepEqual(validateEvidenceEnvelope(mixed), []);
});
