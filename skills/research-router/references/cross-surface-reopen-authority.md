# Cross-surface reopen authority boundary

Status: design constraint; not an implemented authorization path.

## Problem

A material observation on one research surface (`B`) can legitimately make a previously covered surface (`A`) decision-relevant again. The current Research OS intentionally authorizes only same-surface replay-safe reopening. Extending that mechanism to `B -> A` requires proof that the dependency authority existed before the producing read began.

## Safety invariant

A cross-surface reopen MUST NOT be authorized solely from fields supplied in, or mutable state inspected after, the producing observation.

In particular, none of the following is sufficient by itself:

- a target named by the evidence receipt;
- a target named by the candidate/action;
- a dependency edge present only in the post-observation state;
- an `introduced_revision` or similar timestamp/revision field carried by a mutable snapshot;
- matching source/target content, lineage, or current revision numbers.

Those representations can all be populated retrospectively and therefore cannot prove pre-action existence.

## Required authority shape

Before cross-surface reopening is implemented, the execution/control layer must expose a trusted pre-action checkpoint or equivalent append-only transition record that is outside the producing receipt's authority. A valid authorization must be derivable from that pre-action record and bind at minimum:

1. producing/source coverage surface;
2. reopen target coverage surface;
3. the dependency identity already present before execution;
4. the producing action or selection identity;
5. the pre-action research-state revision/checkpoint;
6. the realized one-step material evidence transition;
7. replay/consumption state.

The producing action may reference an existing dependency but must not create, widen, or backdate its own reopen authority.

## Fail-closed behavior

Until a trusted pre-action authority source exists, cross-surface `B -> A` reopening remains unsupported and must fail closed. Same-surface replay-safe reopening remains valid under the existing control contract.

Acquisition failure remains non-evidence and must not consume a valid authorization. A successful reopened bounded read consumes only the exact authorization transition that enabled it.

## Falsification requirements before implementation

Any future implementation must add tests that reject at least:

- post-observation target injection;
- pre-action candidate-local target assertion without state authority;
- post-observation dependency insertion with a forged/backdated revision;
- stale dependency checkpoint/revision;
- producer/target substitution or collision;
- replay of a consumed authorization;
- a failed acquisition being treated as observation or consumption;
- fallback from a consumed newer transition to an older authorization.

It must also positively demonstrate a legitimate pre-existing `B -> A` dependency reopening `A` exactly once after a realized material delta on `B`.

## Architecture consequence

This is Evidence Engine/control-state metadata, not a fourth collaboration hard gate. Evidence, Conflict, and Execution remain the only hard collaboration gates. Do not weaken provenance boundaries or collect credentials/session secrets to manufacture checkpoint identity.
