import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEvidenceObservation } from "../../../scripts/evidence-adapter.mjs";

function validConnectorObservation(overrides = {}) {
  return {
    adapter: "connector_api",
    outcome: "success",
    evidence_id: "e-structured-error",
    direction: "support",
    pointer: "connector://provider/read/1",
    lineage_id: "connector-read:1",
    source_identity: "provider API read",
    authority: "primary",
    specificity: "exact",
    freshness: "current",
    provenance: {
      quality: "verified",
      provider_execution: "read_executed",
    },
    limitations: [],
    ...overrides,
  };
}

test("structured provider result error cannot be normalized into evidence", () => {
  assert.throws(
    () =>
      normalizeEvidenceObservation(
        validConnectorObservation({
          result_error: {
            code: "PROVIDER_ERROR",
            message: "read failed after transport success",
          },
        }),
      ),
    /success observation cannot contain result_error/,
  );
});

test("blank result_error marker does not fabricate a provider failure", () => {
  const result = normalizeEvidenceObservation(
    validConnectorObservation({ result_error: "" }),
  );
  assert.ok(result.evidence);
  assert.equal(result.limitation, null);
});

test("structured limitation payload cannot enter Evidence Envelope evidence", () => {
  assert.throws(
    () =>
      normalizeEvidenceObservation(
        validConnectorObservation({
          limitations: [{ code: "PARTIAL", detail: "provider payload" }],
        }),
      ),
    /limitations\[0\] must be a non-empty string/,
  );
});

test("limitations must be an array when provided", () => {
  assert.throws(
    () =>
      normalizeEvidenceObservation(
        validConnectorObservation({ limitations: "partial" }),
      ),
    /limitations must be an array when provided/,
  );
});
