# Phase 351 - Task Agent Memory Snapshot Monotonic Commit

## Goal

Make delivery-committed task-Agent memory baselines monotonic when one snapshot has multiple Provider dispatch attempts. Once an exact `group + gcs_* + task + tas_* + project` snapshot has a valid committed delivery, a later failed or out-of-order attempt must remain auditable without downgrading the successful baseline.

## Claude Code comparison

The reference remains `D:\claude-code\src\tools\AgentTool\agentMemorySnapshot.ts` and its caller in `loadAgentsDir.ts`.

Claude Code's `.snapshot-synced.json` represents a completed local synchronization state. CCM has an additional distributed boundary: the same prepared prompt snapshot may produce several Provider receipts because of retries, timeout recovery, or delayed runner completion. Treating the last receipt as canonical could therefore turn a completed sync back into rejected.

Phase 351 preserves the completed-state meaning under CCM's asynchronous delivery model.

## Implementation

### Canonical receipt and latest attempt

Each snapshot reference now keeps two evidence roles:

- `deliveryReceipt*` identifies the canonical receipt that established the reusable memory baseline;
- `latestDeliveryAttempt*` identifies the most recent Provider attempt, whether it succeeded or failed.

The session-level latest snapshot fields preserve the same separation and survive process restart.

### Monotonic commit state machine

Before replacing `<snapshotId>.sync.json`, CCM validates the existing canonical chain:

1. canonical delivery receipt checksum and exact identity;
2. snapshot id and outer checksum;
3. sync decision checksum and action;
4. committed sidecar checksum and exact receipt binding;
5. snapshot-reference commit checksum.

If the chain is valid and committed, the sidecar and canonical receipt are preserved. The new attempt is stored as latest-attempt evidence and the delivery call returns `syncCommitDisposition=preserved_committed`.

A rejected baseline may still be upgraded by a later successful attempt. An invalid or tampered commit is not protected and can be repaired by a new successful delivery.

### Inventory, retention, and Memory Center

Inventory validates the latest-attempt receipt independently and reports `memorySnapshotSyncLateFailurePreserved` when:

- the canonical baseline remains committed;
- the latest attempt is valid evidence for the same snapshot;
- the latest attempt differs from the canonical receipt;
- the latest attempt failed.

Memory Center fleet and selected-group cards expose the preserved count. A row retains both the committed state and latest failed attempt status. Retention removes the canonical receipt, latest-attempt receipt, commit sidecar, and snapshot together, then restores both evidence roles from the latest retained reference.

## Verification

New command:

```text
npm run test:task-agent-memory-snapshot-sync-monotonic-commit-restart
```

The 22-check restart test covers:

- successful commit followed by a late failed attempt;
- immutable canonical commit sidecar bytes and checksum;
- canonical successful receipt preservation;
- independent latest failed-attempt evidence;
- session status remaining delivered;
- inventory visibility and latest-attempt validation;
- unchanged next-turn memory remaining `none`;
- restart restoration;
- post-restart late failure preservation;
- exact cross-`gcs_*` rejection;
- Memory Center aggregate and row visibility.

Final focused and adjacent results:

- Phase 351 monotonic commit restart: 22/22;
- Phase 350 sync commit restart: 28/28;
- Phase 349 snapshot sync restart: 23/23;
- task-Agent compact-head fence: 38/38;
- task-Agent session-lifecycle fence: 31/31;
- typed-memory consumption feedback: 18/18;
- Provider access evidence restart: 12/12;
- direct durable dispatch spool: 39/39.

## Boundary

This phase prevents evidence-ordering races from erasing a successful memory delivery. It does not hide Provider instability: the latest failed attempt remains visible as a warning and can be used by runtime health and retry diagnostics.
