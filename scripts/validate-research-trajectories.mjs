import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixturesPath = 'skills/research-router/evals/research-trajectory-fixtures.json';
const data = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));

const standingGatePaths = {
  'runtime-reliability-gates': 'skills/research-router/evals/runtime-reliability-gates.json',
  'evidence-engine-cases': 'skills/research-router/evals/evidence-engine-cases.json',
  'browser-auth-gates': 'skills/research-router/evals/browser-auth-gates.json',
  'collaboration-cases': 'skills/research-router/evals/collaboration-cases.json',
  'research-router-cases': 'skills/research-router/evals/cases.json',
};

const standingCaseIds = new Map();
for (const [gate, path] of Object.entries(standingGatePaths)) {
  const gateData = JSON.parse(fs.readFileSync(path, 'utf8'));
  standingCaseIds.set(gate, new Set((gateData.cases ?? []).map((c) => c.id)));
}

if (!Array.isArray(data.cases) || data.cases.length < 8) {
  throw new Error('research trajectory fixtures must include semantic and grounded replay cases');
}

const ids = new Set();
let groundedReplayCount = 0;
for (const c of data.cases) {
  if (!c.id || ids.has(c.id)) throw new Error(`invalid or duplicate trajectory case id: ${c.id}`);
  ids.add(c.id);
  if (!c.before || !c.observation || !c.after) throw new Error(`trajectory case '${c.id}' is incomplete`);

  if (c.grounding) {
    groundedReplayCount += 1;
    const gateIds = standingCaseIds.get(c.grounding.gate);
    if (!gateIds) throw new Error(`${c.id}: unknown standing gate '${c.grounding.gate}'`);
    if (!gateIds.has(c.grounding.case_id)) {
      throw new Error(`${c.id}: grounding case '${c.grounding.case_id}' does not exist in '${c.grounding.gate}'`);
    }
  }

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

  if (c.after.next_action === 'none' && c.after.decision_sensitive !== false && !c.after.stop_reason) {
    throw new Error(`${c.id}: stopping with decision-sensitive uncertainty must preserve an explicit stop_reason`);
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
  'replay-evaluator-null-preserves-unknown',
  'replay-scope-conflict-changes-verification-path',
  'replay-degraded-fallback-preserves-uncertainty',
  'replay-causal-nondiscriminating-evidence-stops',
]) {
  if (!ids.has(required)) throw new Error(`missing research trajectory semantic fixture: ${required}`);
}

if (groundedReplayCount < 4) {
  throw new Error('research trajectory gate must include at least four cases grounded in standing veto tests');
}

console.log(
  `research trajectory gate passed: ${data.cases.length} state-transition fixtures (${groundedReplayCount} grounded replays)`,
);
