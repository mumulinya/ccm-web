# Phase 264: Compact Epoch Dispatch Barrier

## Goal

Prevent a Task Agent result created from an older group-session memory snapshot from becoming delivered, reinjection-proven, or artifact-proven after a newer compact transaction commits.

The memory identity is always `groupId + gcs_*`. One group may own multiple independent chat sessions, but each Task Agent invocation receives only the current session memory. Global Agent remains global-only and does not consume group-session context.

Historical sessions are intentionally not migrated. The accepted lifecycle is deletion: obsolete sessions and all of their memory artifacts may be removed instead of being copied into a new session.

## Compact Head Ledger

`backend/modules/collaboration/group-compact-head.ts` adds a durable head for every independent group session.

Each `gch_*` head binds:

- exact group and `gcs_*` session identity
- monotonic compact generation
- compact epoch and boundary ID
- verified compact transaction receipt and checksum
- previous-head checksum
- deterministic head ID and head checksum

Updates use a file lock and atomic JSON replacement. The same receipt is idempotent, while a new valid receipt advances the generation. A head can commit only after the new session memory has been saved successfully.

## Dispatch And Delivery Fence

Task Agent memory snapshots now carry the exact compact-head generation, ID, and checksum observed when the snapshot was built.

The binding is revalidated:

1. when the Task Agent snapshot is bound
2. immediately before external Runner dispatch
3. when output and memory delivery are recorded
4. when reinjection and changed-file artifact proof are evaluated

If compaction advances during execution, the old output receives `compact_head_stale`. It cannot become memory-delivered, reinjection-proven, or task-artifact-proven. The task must rerun from a fresh snapshot of the new generation.

The validator compares epoch, compact receipt checksum, compact boundary, generation, head ID, and head checksum. It remains fail-closed for post-compact `gcs_*` sessions.

## Resume Projection Fix

A verified historical compact boundary is no longer erased merely because the current transcript window has no messages requiring another synchronous compact.

The refresh path preserves:

- conversation summary and message digest
- compact boundary and compact transaction receipt
- compacted message count and last compacted message ID
- compressed message count

Invalid or uncommitted boundaries still enter the existing fail-closed rebuild path and are cleared before rebuilding from the raw transcript.

## Memory Center

Memory Center now exposes:

- `compact epoch fence`
- compact-head drift under `compact receipt drift`
- invocation compact-head required, validated, and stale counts
- per-invocation compact generation and fence status
- continuation soak schema v6 compact-head artifact mismatch metrics

The Task Agent snapshot self-test now uses a real session transcript, committed boundary journal, valid compact receipt, and generation-1 compact head.

## Session Deletion

Deleting a `gcs_*` session deletes its compact head together with session memory, compact-boundary artifacts, typed-memory dispatch WAL, invocation lineage, continuation soak files, and related sidecars.

No migration path is required for prior sessions. New sessions start with isolated context and may recall only explicitly permitted long-term memory through the existing typed-memory policies.

## Verification

- `npm run check`: pass
- `npm run build`: pass
- Memory Center Task Agent snapshot self-test: pass, 6/6 checks
- compact-head race self-test: pass, 38 assertions and generations 1 -> 2
- resume projection integration self-test: pass, 7/7 checks
- precompact snapshot rejected after generation 1: pass
- generation-1 output rejected after generation 2 commits: pass
- fresh generation-2 rerun delivered and artifact/reinjection-proven: pass
- session deletion removes compact-head, lineage, and continuation-soak artifacts: pass
- production overview API: HTTP 200, continuation soak schema v6
- production server: `http://localhost:3081`, PID 26600
- provider runtime contracts: 3/3 healthy
- production stderr: 0 bytes

## Result

Group-session memory now has a durable compact generation barrier across snapshot creation, external agent execution, delivery, reinjection proof, and resulting code artifacts. Compaction can no longer race a long-running Task Agent and silently accept output based on obsolete context.
