import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixturesPath = 'skills/research-router/evals/research-trajectory-fixtures.json';
const data = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

if (!Array.isArray(data.cases) || data.cases.length < 4) {
  throw new Error('research trajectory fixtures must include the standing semantic cases');
}

const ids = new Set();
for (const c of data.cases) {
  if (!c.id || ids.has(c.id)) throw new Error(`invalid or duplicate trajectory case id: ${c.id}`);
  ids.add(c.id);
  if (!c.before || !c.observation || !c.after) throw new Error(`trajectory case '${c.id}' is incomplete`);

  assert.equal(
    c.after.revision,
    c.before.revision + 1,
    `${c.id}: each material observation must advance the ledger revision exactly once`,
  );

  if (c.observation.material) {
    assert.equal(c.after.replanned, true, `${c.id}: material observations must trigger re-planning`);
  }

  if (c.after.decision_sensitive === false) {
    assert.equal(c.after.next_action, 'none', `${c.id}: non-decision-sensitive state must stop research`);
  }

  if (c.observation.invalidates_stale_action) {
    assert.notEqual(
      c.after.next_action,
      c.before.next_action,
      `${c.id}: invalidated stale next action must not survive re-planning`,
    );
  }

  const beforeLineages = [...c.before.independent_lineages].sort();
  const afterLineages = [...c.after.independent_lineages].sort();

  if (c.observation.kind === 'acquisition_failure') {
    assert.equal(
      c.after.claim_status,
      c.before.claim_status,
      `${c.id}: acquisition failure must not change claim truth status`,
    );
    assert.deepEqual(
      afterLineages,
      beforeLineages,
      `${c.id}: acquisition failure must not create an evidence lineage`,
    );
    if (!c.observation.limitation) throw new Error(`${c.id}: acquisition failure must preserve a bounded limitation`);
  }

  if (c.observation.kind === 'evidence') {
    if (!c.observation.lineage_id) throw new Error(`${c.id}: evidence observation must declare lineage_id`);
    const expectedLineages = new Set(c.before.independent_lineages);
    expectedLineages.add(c.observation.lineage_id);
    assert.deepEqual(
      afterLineages,
      [...expectedLineages].sort(),
      `${c.id}: independent lineage accounting changed unexpectedly`,
    );
    if (c.observation.claim_status_after) {
      assert.equal(
        c.after.claim_status,
        c.observation.claim_status_after,
        `${c.id}: updated claim status must reflect the material observation`,
      );
    }
    if (typeof c.observation.decision_sensitive_after === 'boolean') {
      assert.equal(
        c.after.decision_sensitive,
        c.observation.decision_sensitive_after,
        `${c.id}: decision sensitivity must be recomputed from the observation`,
      );
    }
  }
}

for (const required of [
  'decisive-evidence-invalidates-stale-plan',
  'new-conflict-replans-before-more-research',
  'acquisition-failure-does-not-become-negative-evidence',
  'same-lineage-summary-does-not-increase-independence',
]) {
  if (!ids.has(required)) throw new Error(`missing research trajectory semantic fixture: ${required}`);
}

console.log(`research trajectory gate passed: ${data.cases.length} executable state-transition fixtures`);
