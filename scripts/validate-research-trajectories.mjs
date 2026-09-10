import fs from 'node:fs';
import assert from 'node:assert/strict';

const fixturesPath = 'skills/research-router/evals/research-trajectory-fixtures.json';
const data = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
const battleReplayData = JSON.parse(
  fs.readFileSync('skills/research-router/evals/battle-replay-cases.json', 'utf8'),
);
const battleReplayIds = new Set((battleReplayData.cases ?? []).map((c) => c.id));

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

const requiredGroundings = new Map([
  [
    'decisive-evidence-invalidates-stale-plan',
    ['evidence-engine-cases', 'stale-state-vs-newer-material-evidence'],
  ],
  [
    'same-lineage-summary-does-not-increase-independence',
    ['evidence-engine-cases', 'duplicate-discovery-vs-independent-verification'],
  ],
  [
    'replay-definition-mismatch-prefers-methodology-read',
    ['evidence-engine-cases', 'apparent-conflict-vs-definition-mismatch'],
  ],
  [
    'replay-lineage-collapse-blocks-majority-vote',
    ['evidence-engine-cases', 'conflict-resolution-vs-majority-vote'],
  ],
  [
    'replay-successful-empty-read-preserves-unknown',
    ['evidence-engine-cases', 'acquisition-failure-vs-negative-fact'],
  ],
  [
    'replay-ui-success-does-not-prove-provider-read',
    ['evidence-engine-cases', 'fact-vs-inference-vs-causal-claim'],
  ],
]);

const hasExactScopeExhaustiveAbsenceProof = (observation) =>
  observation.absence_observed === true &&
  observation.exhaustive_enumeration_established === true &&
  observation.enumeration_scope_matches_claim === true;

assert.equal(
  hasExactScopeExhaustiveAbsenceProof({
    absence_observed: true,
    exhaustive_enumeration_established: true,
    enumeration_scope_matches_claim: false,
  }),
  false,
  'exhaustive enumeration of the wrong scope must not qualify as negative evidence',
);
assert.equal(
  hasExactScopeExhaustiveAbsenceProof({
    absence_observed: true,
    exhaustive_enumeration_established: true,
    enumeration_scope_matches_claim: true,
  }),
  true,
  'exact-scope exhaustive enumeration should qualify for absence evaluation',
);

if (!Array.isArray(data.cases) || data.cases.length < 10) {
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

  if (requiredGroundings.has(c.id)) {
    const [requiredGate, requiredCaseId] = requiredGroundings.get(c.id);
    assert.deepEqual(
      [c.grounding?.gate, c.grounding?.case_id],
      [requiredGate, requiredCaseId],
      `${c.id}: critical trajectory must remain grounded in ${requiredGate}/${requiredCaseId}`,
    );
  }

  if (c.battle_replay_id && !battleReplayIds.has(c.battle_replay_id)) {
    throw new Error(`${c.id}: battle replay '${c.battle_replay_id}' does not exist in battle-replay-cases.json`);
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
    if (c.observation.provenance_established === false) {
      assert.deepEqual(
        afterLineages,
        beforeLineages,
        `${c.id}: evidence with unresolved provenance must not increase independent lineage count`,
      );
      assert.equal(
        c.after.claim_status,
        c.before.claim_status,
        `${c.id}: evidence with unresolved material provenance must not upgrade claim truth status`,
      );
      if (!c.observation.limitation) {
        throw new Error(`${c.id}: unresolved evidence provenance must preserve a bounded limitation`);
      }
    } else {
      if (!c.observation.lineage_id) throw new Error(`${c.id}: evidence observation must declare lineage_id`);
      const expectedLineages = new Set(c.before.independent_lineages);
      expectedLineages.add(c.observation.lineage_id);
      assert.deepEqual(
        afterLineages,
        [...expectedLineages].sort(),
        `${c.id}: independent lineage accounting changed unexpectedly`,
      );
    }
    if (c.observation.absence_observed === true && !hasExactScopeExhaustiveAbsenceProof(c.observation)) {
      assert.equal(
        c.after.claim_status,
        c.before.claim_status,
        `${c.id}: an empty observation must not become a negative fact unless exhaustive enumeration is proven for the material claim scope`,
      );
      if (!c.observation.limitation) {
        throw new Error(`${c.id}: absence evidence without exact-scope exhaustive enumeration must preserve its visibility/enumeration limitation`);
      }
    }
    if (c.observation.claim_status_after) {
      assert.equal(
        c.after.claim_status,
        c.observation.claim_status_after,
        `${c.id}: updated claim status must reflect the material observation`,
      );
    }
    if (
      ['inference', 'causal'].includes(c.before.claim_kind) &&
      c.observation.supports_claim_kind === 'observed_fact'
    ) {
      assert.notEqual(
        c.after.claim_status,
        'Confirmed',
        `${c.id}: observed facts must not directly confirm an inference or causal claim`,
      );
      assert.equal(
        c.after.claim_kind,
        c.before.claim_kind,
        `${c.id}: observed evidence must not silently rewrite the claim kind`,
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
  'replay-unresolved-provenance-does-not-create-independence',
  'replay-observed-fact-does-not-confirm-causal-claim',
  'replay-definition-mismatch-prefers-methodology-read',
  'replay-lineage-collapse-blocks-majority-vote',
  'replay-successful-empty-read-preserves-unknown',
  'replay-ui-success-does-not-prove-provider-read',
]) {
  if (!ids.has(required)) throw new Error(`missing research trajectory semantic fixture: ${required}`);
}

for (const requiredId of requiredGroundings.keys()) {
  if (!ids.has(requiredId)) throw new Error(`missing critical grounded research trajectory fixture: ${requiredId}`);
}

if (groundedReplayCount < 6) {
  throw new Error('research trajectory gate must include at least six cases grounded in standing veto tests');
}

console.log(
  `research trajectory gate passed: ${data.cases.length} state-transition fixtures (${groundedReplayCount} grounded replays)`,
);
