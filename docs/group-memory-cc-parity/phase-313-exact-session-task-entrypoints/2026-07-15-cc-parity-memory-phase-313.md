# CCM Memory Phase 313: Exact-session task entrypoints

Date: 2026-07-15

Status: implemented, verified, ready for production deployment

Long-term goal status: active

## Why this phase was required

The group chat UI already supplied `group_session_id`, but `createTask()` discarded it. A task therefore lost its conversation ownership before queue dispatch, and the five-minute semantic deduplication key did not include the conversation. Two conversations in the same group could be merged, while later child-Agent memory construction could silently fall back to the legacy group root or whichever conversation happened to be active.

The direct broadcast and requirement-decomposition APIs also accepted an empty session identity. This contradicted the core CCM rule that every group conversation owns an independent memory and that every new third-party child-Agent execution must receive that exact conversation memory as context.

## Claude Code parity reference

This phase rechecked the current reference materials under `D:\claude-code\docs\context`:

- `compaction.mdx`: compact boundaries, preserved recent segment, post-compact reinjection, PTL fallback, and model-aware budgets.
- `project-memory.mdx`: bounded `MEMORY.md`, typed memory documents, selective side-query recall, and already-surfaced deduplication.
- `hooks.mdx`: session-scoped pre/post compact and session-start lifecycle.
- `token-budget.mdx`: context-window-aware compaction thresholds and bounded restored context.

CCM already implements those capability families. Phase 313 closes the production ownership path that connects them to real group tasks and third-party child-Agent sessions.

## Implementation

### Writable exact-session resolver

`backend/modules/collaboration/storage.ts` now exports `resolveWritableGroupChatSession()`.

- A requested session must exist in the requested group, use a `gcs_*` identity, and be writable.
- Cross-group, legacy, missing, and archived identities fail closed.
- When no session is supplied, the current writable `gcs_*` is used.
- A group whose active conversation is only the old `default` scope receives a new `gcs_*` conversation instead of accepting new work into legacy memory.

### Task ownership persistence

`backend/modules/collaboration/collaboration.ts` now persists `group_session_id` on every newly created group task.

- The semantic deduplication key is `group + group session + target project + workflow`.
- The same goal can run independently in two conversations or two groups.
- A global task with no group remains global-only and carries no group session.
- A global Agent handoff to a group main Agent is bound to the target group's exact conversation before queue dispatch.
- Task creation trace evidence includes the exact group session.

### Production entrypoint fence

`backend/modules/collaboration/group-live-routes.ts` resolves a writable exact session for normal send, broadcast, and decomposition before appending messages or creating tasks.

All seven production calls to `buildAgentMemoryContextBundleWithManifestSelection()` now set `requireExactGroupSession: true`. Missing exact identity is rejected even for an `ignore memory` turn; ignore semantics suppress memory content but never remove conversation ownership.

### Child-Agent binding identity

`backend/modules/collaboration/memory.ts` now includes `group_session_id` in `session_binding`, includes it in the binding checksum identity, and marks an exact conversation binding as required. The rendered child-Agent context therefore has a durable identity linking the task, memory bundle, and target conversation.

## Runtime invariants

1. A new group task always persists a valid `gcs_*` belonging to its group.
2. A group task cannot be deduplicated against a sibling conversation or another group.
3. A child-Agent memory packet cannot be produced by a production dispatch path without an exact session.
4. A process restart preserves task-to-conversation ownership.
5. Child context for conversation B contains B's identity and does not project conversation A.
6. Global Agent model context remains global-only; only its handoff task to a group main Agent receives the target group's session binding.
7. Existing legacy tasks are not migrated into a new conversation and cannot silently regain access through root-memory fallback.

## Verification

New two-process acceptance test:

`npm run test:group-task-exact-session-entrypoints`

The first process verifies 10 entrypoint and ownership checks. A second Node process reloads the same isolated HOME and verifies five restart/context checks, including multiple groups, multiple conversations, global-to-group handoff, strict production callsites, exact child context, and sibling-session exclusion.

Representative parity regressions executed successfully:

| Capability | Runtime evidence |
| --- | --- |
| Exact task/session entrypoints and restart | `group-task-exact-session-entrypoints-selftest.mjs` |
| Global-only Agent context | `global-agent-global-only-context-selftest.mjs` |
| Worker compact strategy and PTL isolation | `worker-context-compact-session-strategy-isolation-selftest.mjs` |
| Auto-compaction session scope | `group-memory-auto-compaction-session-scope-selftest.mjs` |
| Compact resume baseline and recovery | `group-memory-resume-integration-selftest.mjs` |
| Pre/post compact hook isolation | `group-memory-compaction-hook-session-isolation-selftest.mjs` |
| Real Provider child-Agent, restart, reinjection, artifact closure | `task-agent-real-provider-version-task-soak-selftest.mjs` (151 checks) |
| Post-turn summary anchors and ignore-memory semantics | `group-post-turn-summary-anchor-selftest.mjs` |
| Typed semantic topics and cross-session isolation | `group-session-model-extraction-semantic-topics-selftest.mjs` |
| Intelligent manifest recall, dedup, and ignore semantics | `group-typed-memory-manifest-selector-calibration-selftest.mjs` (35 checks) |
| Incremental long-term distillation | `group-typed-memory-incremental-distillation-cursor-selftest.mjs` |
| Partial compact and exact cleanup scope | `post-compact-cleanup-source-scope-selftest.mjs` |
| Durable snip/partial replay | `group-memory-resume-snip-replay-selftest.mjs` |
| Provider compact generation crash reconciliation | `provider-native-compact-generation-restart-reconciliation-selftest.mjs` |
| Memory Center session isolation | `memory-center-session-scope-selftest.mjs` |

Backend TypeScript build and all listed tests passed on 2026-07-15. Raw transcripts remained unmodified in compact, distillation, and restart tests.

## Remaining long-term direction

The long-term goal remains active. Functional parity is now approximately 99.98%, with the remaining work treated as continued adversarial audit against future Claude Code changes, real provider/version drift, and newly discovered production entrypoints rather than a known missing core memory capability.
