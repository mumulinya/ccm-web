# Phase 268: Global Agent Global-Only Context Boundary

Date: 2026-07-14

## Goal

Make the Global Agent a global-memory and routing-only coordinator. It must not receive group-session messages, group-session memory, project memory, ordinary group task content, or any `gcs_*` identity. Group main Agents and project child Agents continue to use memory keyed by `groupId + groupSessionId`.

Legacy single-session data is not migrated. The established startup policy remains `delete_legacy_default_without_migration`; an empty group receives a new independent `gcs_*` session after deletion.

## Claude Code Alignment

Claude Code keeps local Agent execution input explicit and task-scoped in `D:/claude-code/src/tasks/LocalAgentTask/LocalAgentTask.tsx`. CCM now applies the same ownership principle to a multi-Agent hierarchy:

- Global Agent: global Agent session, global long-term memory, global-owned task state, project/group routing directory, and runtime capability directory.
- Group main Agent: only the selected `groupId + groupSessionId` conversation and memory.
- Project child Agent: a fresh provider session receiving only the owning group-session memory capsule and task handoff.

The Phase 266 parent/child cancellation behavior remains aligned with Claude Code's `createChildAbortController` lifecycle model. Phase 268 adds the equivalent data-plane boundary: stale or unrelated context cannot ride along with a resumed run.

## Implementation

### Context producer allowlist

`backend/modules/global/global-agent.ts` now:

- removes group maintenance notifications, group delivery health, cleanup-repair context, and project memory from automatic Global Agent context;
- filters task summaries and `list_tasks` to tasks carrying Global Agent ownership lineage;
- reduces `inspect_project` to routing metadata;
- emits a five-source allowlist manifest;
- records an SHA-256 context boundary proof;
- validates top-level fields, routing row fields, task policy, manifest membership, proof schema/checksum, and absence of `gcs_*` identities.

### Model-input projection

`backend/agents/global/loop.ts` now projects persisted run state before every model call:

- historical `inspect_project` observations lose project memory and group-session fields;
- historical `list_tasks` rows are dropped unless their observation carries the new `global_agent_owned_tasks_only` boundary proof;
- mission/supervision and dispatch observations retain route/status fields only;
- group-session keys and `gcs_*` values are removed from tool arguments and allowed global observation families;
- reasoning fact summaries, assertion evidence, deviation details, and prior step messages/errors are not reinjected;
- the live context proof is verified before model invocation, including resumed runs after restart.

Raw persisted evidence is retained for audit and diagnostics. Only the model-facing view is projected, so isolation does not destroy operational evidence.

## Verification

New command:

```text
npm run test:global-agent-global-only-context
```

The Phase 268 test creates a recovered run contaminated with group messages, group memory, project memory, an ordinary group task title, `gcs_*`, and contaminated reasoning facts. It proves:

- global memory is included;
- a proven Global Agent task is included;
- two groups and their project routes remain visible;
- all group-session/project-memory sentinels are absent from actual model messages;
- historical unproven task rows are absent;
- a re-sealed but policy-invalid context is rejected;
- a checksum-tampered context is rejected;
- model invocation does not occur after boundary rejection.

Result: 13/13 checks passed.

Regression evidence:

- Phase 264 compact-head fence: 38/38 passed.
- Phase 265 session lifecycle fence: 31/31 passed.
- Phase 266 real Runner abort: 33/33 passed.
- Phase 267 lifecycle anti-rollback: 38/38 passed.
- Multi-group/multi-session budget and ownership suite: 12/12 passed; legacy default session count is zero.
- Global Agent loop self-test: passed.
- TypeScript check: passed.
- Active global memory audit: 653,274 serialized characters, zero `gcs_*` identities.

## Stable Memory

- A group chat is not one unbounded conversation. It owns multiple independent `gcs_*` sessions.
- Group memory identity is always `groupId + groupSessionId`.
- Deleting a group session deletes its context and artifacts; old `default` sessions are purged without migration.
- The Global Agent never receives group-session or project memory, even through resumed tool observations.
- Project child Agents receive only the current owning group-session capsule when a fresh third-party Agent session is created.
- The long-term Claude Code parity goal remains active after this phase.
