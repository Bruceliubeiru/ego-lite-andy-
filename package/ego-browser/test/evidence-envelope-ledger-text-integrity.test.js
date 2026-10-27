import assert from "node:assert/strict";
import test from "node:test";

import {
  countIndependentEvidenceLineages,
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

test("same-lineage conflicting passages remain inspectable without becoming independent sources", () => {
  const envelope = makeEnvelope();
  envelope.status = "Conflicted";
  envelope.confidence.level = "medium";
  envelope.next_action = "verify";
  envelope.evidence[0].lineage_id = "shared-source";
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "contradict-1",
    direction: "contradict",
    pointer: "conflicting section",
  });
  envelope.conflicts = [
    {
      evidence_ids: ["support-1", "contradict-1"],
      issue: "Two passages in one source disagree.",
      state: "unresolved",
    },
  ];

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting source + conflicting section",
  );

  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "summary-1",
    pointer: "repeated summary of supporting source",
  });
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting source + conflicting section",
    "a same-lineage summary must not inflate the ledger evidence list",
  );
});

test("contradictory evidence remains visible before a conflict is classified", () => {
  const envelope = makeEnvelope();
  envelope.status = "Needs verification";
  envelope.confidence.level = "low";
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "contradict-1",
    direction: "contradict",
    pointer: "unresolved contradictory observation",
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting source + unresolved contradictory observation",
  );
});

test("contextual first pointer must not hide later same-lineage supporting evidence", () => {
  const envelope = makeEnvelope();
  envelope.evidence.unshift({
    ...envelope.evidence[0],
    evidence_id: "context-1",
    direction: "context",
    pointer: "general source overview",
  });
  envelope.evidence.push({
    ...envelope.evidence[1],
    evidence_id: "support-summary",
    pointer: "same-source supporting summary",
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "general source overview + supporting source",
    "retain the first real support but collapse later same-lineage summaries",
  );
});

test("contradiction first must not hide later same-lineage supporting evidence", () => {
  const envelope = makeEnvelope();
  envelope.status = "Conflicted";
  envelope.confidence.level = "medium";
  envelope.evidence.unshift({
    ...envelope.evidence[0],
    evidence_id: "contradict-1",
    direction: "contradict",
    pointer: "contradictory passage",
  });
  envelope.conflicts = [
    {
      evidence_ids: ["contradict-1", "support-1"],
      issue: "The same source gives incompatible observations.",
      state: "unresolved",
    },
  ];

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "contradictory passage + supporting source",
  );
});

test("first support pointer is not duplicated after contextual or repeated support references", () => {
  const envelope = makeEnvelope();
  envelope.evidence.unshift({
    ...envelope.evidence[0],
    evidence_id: "context-1",
    direction: "context",
    pointer: "supporting source",
  });
  envelope.evidence.push({
    ...envelope.evidence[1],
    evidence_id: "support-summary",
    pointer: "same-source summary",
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting source",
  );
});

test("navigation-only support must not hide later verified support from the same lineage", () => {
  const envelope = makeEnvelope();
  envelope.evidence[0] = {
    ...envelope.evidence[0],
    evidence_id: "snippet-1",
    pointer: "search result preview",
    source_class: "search_snippet",
    authority: "navigation_only",
    specificity: "broad",
    provenance: {
      quality: "partial",
      source_identity: "official page search result",
    },
    limitations: ["Underlying page not yet verified."],
  };
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "verified-1",
    pointer: "verified official page",
    source_class: "first_party_public",
    authority: "primary",
    specificity: "exact",
    provenance: { quality: "verified", source_identity: "official page" },
    limitations: [],
  });
  envelope.evidence.push({
    ...envelope.evidence[1],
    evidence_id: "verified-summary",
    pointer: "repeated summary of verified page",
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(countIndependentEvidenceLineages(envelope), 1);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "search result preview + verified official page",
    "verified same-lineage evidence must remain visible without counting repeated summaries",
  );
});

test("later navigation hints do not displace an already projected verified source", () => {
  const envelope = makeEnvelope();
  envelope.evidence.push({
    ...envelope.evidence[0],
    evidence_id: "snippet-1",
    pointer: "later navigation-only preview",
    source_class: "search_snippet",
    authority: "navigation_only",
    specificity: "broad",
    provenance: {
      quality: "partial",
      source_identity: "official page search result",
    },
    limitations: ["Preview only."],
  });

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting source",
    "navigation-only repetition must not inflate a lineage already represented by verified support",
  );
});

test("transitive acquired-source aliases project once despite lineage rekeys", () => {
  const envelope = makeEnvelope();
  const base = envelope.evidence[0];
  envelope.evidence = [
    { ...base, evidence_id: "original", lineage_id: "L1", pointer: "official original",
      provenance: { quality: "verified", source_identity: "source A" } },
    { ...base, evidence_id: "alias", lineage_id: "L1", pointer: "alias summary",
      provenance: { quality: "verified", source_identity: "source B" } },
    { ...base, evidence_id: "rekey", lineage_id: "L2", pointer: "rekeyed summary",
      provenance: { quality: "verified", source_identity: "source B" } },
  ];

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(projectEvidenceEnvelopeToLedger(envelope).Evidence, "official original");
  envelope.evidence.reverse();
  assert.equal(projectEvidenceEnvelopeToLedger(envelope).Evidence, "rekeyed summary",
    "reordering can change which pointer is shown but must not inflate the source count");
});

test("different verified document pages remain separate ledger evidence", () => {
  const envelope = makeEnvelope();
  const base = envelope.evidence[0];
  envelope.evidence = [
    { ...base, evidence_id: "page-a", lineage_id: "L1", pointer: "page A",
      provenance: { quality: "verified", source_identity: "general docs",
        page_url: "https://example.test/docs/a" } },
    { ...base, evidence_id: "page-b", lineage_id: "L2", pointer: "page B",
      provenance: { quality: "verified", source_identity: "general docs",
        page_url: "https://example.test/docs/b" } },
  ];

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(projectEvidenceEnvelopeToLedger(envelope).Evidence, "page A + page B");
});

test("source alias deduplication does not erase a contradictory pointer", () => {
  const envelope = makeEnvelope();
  const base = envelope.evidence[0];
  envelope.status = "Conflicted";
  envelope.confidence.level = "low";
  envelope.evidence = [
    { ...base, evidence_id: "support", lineage_id: "L1", pointer: "supporting passage",
      provenance: { quality: "verified", source_identity: "same document" } },
    { ...base, evidence_id: "contradict", lineage_id: "L2", direction: "contradict",
      pointer: "contradictory passage",
      provenance: { quality: "verified", source_identity: "same document" } },
  ];
  envelope.conflicts = [{
    issue: "The source gives conflicting statements.",
    state: "unresolved",
    evidence_ids: ["support", "contradict"],
  }];

  assert.deepEqual(validateEvidenceEnvelope(envelope), []);
  assert.equal(
    projectEvidenceEnvelopeToLedger(envelope).Evidence,
    "supporting passage + contradictory passage",
  );
});
