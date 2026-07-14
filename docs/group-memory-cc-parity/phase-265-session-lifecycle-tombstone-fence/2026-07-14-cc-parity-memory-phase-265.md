# Phase 265: Session Lifecycle Tombstone Fence

## Goal

Prevent a Task Agent result created from a group-session memory snapshot from becoming delivered, reinjection-proven, or artifact-proven after that group session is archived, restored to a new generation, or deleted.

The memory identity remains `groupId + gcs_*`. One group may own multiple independent chat sessions, and each Task Agent receives only the memory of the exact session that dispatched it. Global Agent remains global-context-only and does not consume group-session context.

Historical and legacy sessions are intentionally not migrated. The accepted policy is direct deletion: obsolete sessions and their memory artifacts are removed, while a durable deletion tombstone remains to reject late Task Agent output.

## Lifecycle Head

`backend/modules/collaboration/group-session-lifecycle-head.ts` adds one durable lifecycle head for every `groupId + gcs_*` identity.

Each head binds:

- exact group and group-session identity
- monotonic lifecycle generation
- `active`, `archived`, or `deleted` status
- deterministic head ID and checksum
- previous-head checksum
- transition reason and timestamp

Updates use file locking and atomic JSON replacement. New sessions start at active generation 1. Archive, restore, and delete transitions advance the generation. A deleted tombstone cannot be reactivated, and corrupt primary and backup heads fail closed.

The lifecycle tombstone is not owned by normal session-memory artifact cleanup. It intentionally survives transcript, compact-boundary, typed-memory, invocation-lineage, continuation-soak, and other sidecar deletion.

## Dispatch And Delivery Fence

Task Agent memory snapshots now bind the lifecycle head ID, generation, status, and checksum observed for the exact group session.

The binding is revalidated:

1. when the memory snapshot is created
2. immediately before external Agent dispatch
3. when output and memory delivery are recorded
4. when reinjection and changed-file artifact proof are evaluated

If the session is archived, deleted, corrupt, or has advanced to another lifecycle generation, dispatch fails with `TASK_AGENT_GROUP_SESSION_STALE` or late output receives `session_lifecycle_stale`.

Stale output cannot become:

- memory-delivered
- reinjection-proven
- changed-file task-artifact-proven

Old-format `gcs_*` snapshots without lifecycle fields do not receive a compatibility exemption. They fail closed.

## Deletion Race Closure

The compact-generation fence from Phase 264 protects post-compact sessions, but a precompact session may not have a compact head. The lifecycle head closes that gap independently of compaction.

The verified race is:

1. a Task Agent dispatches against active generation 1
2. the owning group session is deleted
3. deletion commits a generation-2 `deleted` tombstone before transcript removal
4. the old Task Agent completes after deletion
5. its output is rejected as `session_lifecycle_stale`
6. a replacement `gcs_*` session starts with an independent active generation 1
7. only a fresh task bound to the replacement session may deliver and prove artifacts

Deleting the last group session may create a replacement session so the group remains usable, but the replacement always has a new session ID and receives no implicit context migration.

## Memory Center

Memory Center now exposes:

- `session lifecycle fence`
- required, valid, and stale lifecycle-fence counts
- lifecycle generation and status on Task Agent snapshot rows
- lifecycle-fence state in invocation-lineage diagnostics

These counters are scoped by the selected `groupId + gcs_*`; another session in the same group cannot contribute its lifecycle or consumption evidence.

## Verification

- `npm run check`: pass
- `npm run build`: pass
- session-lifecycle deletion race: pass, 31 assertions
- compact-head race regression: pass, 38 assertions
- Memory Center session-scope self-test: pass, 13/13 checks
- group-session maintenance race: pass, 4/4 checks
- group-session sidecar isolation: pass, 14/14 checks
- deleted session late output rejected: pass
- deleted session new dispatch rejected before Runner invocation: pass
- stale output cannot prove delivery, reinjection, or changed-file artifacts: pass
- replacement session uses a new ID and independent generation 1: pass
- memory artifact deletion retains the deleted tombstone: pass
- production overview API: HTTP 200 with lifecycle counters present
- production server: `http://localhost:3081`, PID 31632
- production stderr: empty

## Result

Group-session deletion now has a durable generation barrier across snapshot creation, external Agent execution, delivery, reinjection proof, and resulting code artifacts. A long-running Task Agent can no longer write trustworthy results into a session that was deleted while it ran, including precompact sessions with no compact generation.

