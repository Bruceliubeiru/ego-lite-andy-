import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalizeEvidenceObservation } from './evidence-adapter.mjs';

const fixturePaths = [
  'skills/research-router/evals/evidence-adapter-fixtures.json',
  'skills/research-router/evals/evidence-adapter-consistency-fixtures.json',
  'skills/research-router/evals/evidence-adapter-limitation-provenance-fixtures.json',
  'skills/research-router/evals/evidence-adapter-provenance-type-fixtures.json',
  'skills/research-router/evals/evidence-adapter-schema-enum-fixtures.json',
  'skills/research-router/evals/evidence-adapter-empty-result-fixtures.json',
];
const fixtureSets = fixturePaths.map((path) => JSON.parse(fs.readFileSync(path, 'utf8')));

let validCount = 0;
let invalidCount = 0;

for (const fixtures of fixtureSets) {
  for (const fixture of fixtures.valid ?? []) {
    validCount += 1;
    const result = normalizeEvidenceObservation(fixture.observation);
    assert.equal(
      Boolean(result.evidence),
      fixture.expect_evidence,
      `fixture '${fixture.name}' evidence presence changed`,
    );

    if (fixture.expect_evidence) {
      assert.equal(
        result.evidence.source_class,
        fixture.expected_source_class,
        `fixture '${fixture.name}' source class changed`,
      );
      assert.equal(result.limitation, null, `fixture '${fixture.name}' should not emit limitation`);
      for (const limitation of fixture.expected_evidence_limitations ?? []) {
        assert.equal(
          result.evidence.limitations.includes(limitation),
          true,
          `fixture '${fixture.name}' missing expected evidence limitation '${limitation}'`,
        );
      }
    } else {
      assert.equal(result.evidence, null, `fixture '${fixture.name}' must not create evidence`);
      assert.equal(
        result.limitation?.outcome,
        fixture.expected_limitation_outcome,
        `fixture '${fixture.name}' limitation outcome changed`,
      );

      if (fixture.expected_limitation_provenance) {
        assert.deepEqual(
          result.limitation?.provenance,
          fixture.expected_limitation_provenance,
          `fixture '${fixture.name}' limitation provenance changed`,
        );
      }
      for (const field of fixture.expected_absent_limitation_provenance ?? []) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(result.limitation?.provenance ?? {}, field),
          false,
          `fixture '${fixture.name}' unexpectedly copied limitation provenance field '${field}'`,
        );
      }
    }
  }

  for (const fixture of fixtures.invalid ?? []) {
    invalidCount += 1;
    assert.throws(
      () => normalizeEvidenceObservation(fixture.observation),
      (error) => error instanceof Error && error.message.includes(fixture.error_contains),
      `invalid fixture '${fixture.name}' did not fail as expected`,
    );
  }
}

console.log(
  `evidence-adapter gate passed: ${validCount} valid fixtures, ${invalidCount} invalid fixtures`,
);
