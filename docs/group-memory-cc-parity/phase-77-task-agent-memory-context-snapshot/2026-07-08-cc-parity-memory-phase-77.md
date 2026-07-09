# Phase 77 - Task Agent Memory Context Snapshot Binding

## Goal

Move CCM closer to Claude Code style memory/context reliability by binding the exact memory context sent to each third-party child Agent session to the durable `task_agent_session`.

The gap before this phase: delivery summary and receipt validation could collect memory gates from timeline / assignment evidence, but a real child Agent session did not have a durable record of the precise worker handoff memory snapshot it received.

## Implemented

- Added `ccm-task-agent-memory-context-snapshot-v1` snapshots under:
  - `~/.cc-connect/task-agent-memory-context-snapshots/<taskAgentSessionId>/<snapshotId>.json`
- Extended `TaskAgentSession` with:
  - `memoryContextSnapshotId`
  - `memoryContextSnapshotPath`
  - `memoryContextSnapshotChecksum`
  - `memoryContextPacketId`
  - `memoryContextSnapshotAt`
  - `memoryContextSnapshots`
- Added session APIs:
  - `bindTaskAgentMemoryContextSnapshot()`
  - `listTaskAgentMemoryContextSnapshots()`
- Bound worker handoff memory snapshots before third-party child Agent execution:
  - worker context packet
  - worker handoff summary
  - memory context
  - gate ids
  - rendered prompt checksum
  - runtime tool snapshot
- Re-bound snapshots when runtime fallback opens a new task Agent session.
- Enriched child Agent receipts with:
  - `memory_context_snapshot_id`
  - `memory_context_snapshot_checksum`
  - `worker_context_packet_id`
- Delivery summary now loads session-bound memory context snapshots and uses them as evidence for:
  - memory dispatch gates
  - Global Agent memory receipt gates
  - Global Agent memory health gates
  - read plan revalidation gates
  - post-compact reinjection gates
  - post-compact dispatch markers
- Added `ccm-task-agent-memory-context-snapshot-receipt-validation-v1`.
  - A receipt now fails quality if the task has session-bound memory snapshots but the receipt cannot be matched to the exact task Agent session / snapshot.
- Runtime kernel now exposes `task_agent_memory_context_snapshot` with pass/mismatch status.
- Acceptance gate now includes `task_agent_memory_snapshot_receipt`.

## Selftests

Added:

- `runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest()`
- `taskAgentMemoryContextSnapshotBindsSession` in `runTaskAgentSessionSelfTest()`

Updated:

- `runCollaborationUxSelfTest()`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Verification

Passed:

- `npm run build:backend`
- `runTaskAgentMemoryContextSnapshotReceiptValidationSelfTest`
- `runTaskAgentSessionSelfTest`
- `runMemoryDispatchGateReceiptValidationSelfTest`
- `runGlobalMemoryUsageReceiptValidationSelfTest`
- `runGlobalMemoryHealthGateReceiptValidationSelfTest`
- `runReadPlanRevalidationGateReceiptValidationSelfTest`
- `runPostCompactReinjectionGateReceiptValidationSelfTest`
- `runCollaborationUxSelfTest`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- Global Agent memory selftest contamination scan:
  - active: `0`
  - residue: `0`

## Result

CCM now has a durable evidence chain from:

`memory bundle generated -> worker handoff dispatched -> task Agent session opened -> memory context snapshot persisted -> third-party Agent receipt returned -> receipt validated against the injected session snapshot and gates`.

## Remaining Direction

The long-term goal is still active. Next upgrades should continue toward Claude Code parity by strengthening:

- snapshot retention / pruning UI in Memory Center
- actual native third-party runner receipt capture across Claude Code / Cursor / Codex adapters
- post-compact recovery replay using these session snapshots
- cross-group and global memory arbitration evidence shown directly beside each session snapshot
