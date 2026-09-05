# Ego concurrent CDP safety

Upstream tracking: `citrolabs/ego-lite#213` documents that raw CDP routing currently behaves like a global channel whose active target/session can be changed across task spaces. Until upstream provides per-task-space CDP channel isolation, treat raw CDP target switching as a shared critical section rather than task-space-local state.

## Default policy

- Prefer task-space-scoped high-level Ego helpers for snapshots, navigation, links, extraction, and other verification work.
- Do not assume that opening several Ego task spaces makes raw CDP state independent.
- Avoid parallel raw-CDP operations across task spaces when the operation changes the active CDP target/session or enables session-scoped domains.
- If raw CDP is materially necessary, serialize the raw-CDP critical section, then re-verify the intended task space, current URL/page identity, and relevant rendered state before trusting or reporting the result.
- If cross-space identity cannot be re-established confidently, fail closed and rerun the verification in a single task space.

This is a correctness and isolation guardrail, not a claim that every concurrent Ego operation is unsafe. High-level task-space helpers remain preferred; the restriction is specifically for shared/global CDP state until the upstream isolation issue is resolved and verified.
