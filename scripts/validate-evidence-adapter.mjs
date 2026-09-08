import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalizeEvidenceObservation } from './evidence-adapter.mjs';

const fixtures = JSON.parse(
  fs.readFileSync('skills/research-router/evals/evidence-adapter-fixtures.json', 'utf8'),
);

for (const fixture of fixtures.valid ?? []) {
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
  } else {
    assert.equal(result.evidence, null, `fixture '${fixture.name}' must not create evidence`);
    assert.equal(
      result.limitation?.outcome,
      fixture.expected_limitation_outcome,
      `fixture '${fixture.name}' limitation outcome changed`,
    );
  }
}

for (const fixture of fixtures.invalid ?? []) {
  assert.throws(
    () => normalizeEvidenceObservation(fixture.observation),
    (error) => error instanceof Error && error.message.includes(fixture.error_contains),
    `invalid fixture '${fixture.name}' did not fail as expected`,
  );
}

console.log(
  `evidence-adapter gate passed: ${(fixtures.valid ?? []).length} valid fixtures, ${(fixtures.invalid ?? []).length} invalid fixtures`,
);
