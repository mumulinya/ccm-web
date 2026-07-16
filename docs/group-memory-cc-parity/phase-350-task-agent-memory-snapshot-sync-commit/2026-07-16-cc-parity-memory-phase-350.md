# Phase 350 - Task Agent Memory Snapshot Sync Commit

## Goal

Close the last delivery-trust gap in task-Agent memory snapshot synchronization. A snapshot written by CCM is only a prepared candidate. It becomes a reusable baseline for the exact third-party child-Agent session only after the Provider delivery receipt proves that the prompt containing that snapshot was dispatched successfully.

The identity boundary remains `group + gcs_* + task + tas_* + project`. Global Agent context is not admitted into this group-session path.

## Claude Code comparison

The reference is `D:\claude-code\src\tools\AgentTool\agentMemorySnapshot.ts`.

Claude Code saves synchronized metadata after the snapshot copy succeeds. Phase 349 had the equivalent `initialize`, `prompt_update`, and `none` decision, but writing the CCM snapshot file could still make an undelivered snapshot look like a trusted baseline on the next turn.

Phase 350 introduces the same ordering invariant:

1. prepare the snapshot and sync decision;
2. dispatch the exact rendered prompt;
3. persist a delivery receipt;
4. commit or reject the prepared snapshot;
5. allow `none` only when every prior proof is valid.

## Implementation

### Two-phase sync lifecycle

Every delivery attempt writes a separate `<snapshotId>.sync.json` sidecar with schema `ccm-task-agent-memory-snapshot-sync-commit-v1`.

The sidecar binds:

- group, `gcs_*`, task, `tas_*`, and project identity;
- snapshot id and outer snapshot checksum;
- inner sync decision checksum and action;
- delivery receipt id and checksum;
- delivery status and committed/rejected state;
- an independent SHA-256 commit checksum.

The original snapshot is never rewritten after delivery, so the delivery receipt's snapshot checksum remains stable.

### Trusted baseline rule

The next turn trusts a previous baseline only when all four layers pass:

1. outer snapshot checksum and identity;
2. inner sync decision checksum and identity;
3. successful, exact-prompt delivery receipt;
4. committed sidecar with exact snapshot, decision, and receipt binding.

Missing delivery, failed delivery, missing sidecar, a rejected sidecar, or any tamper forces `prompt_update`. The reason is `previous_snapshot_uncommitted` when the prepared snapshot itself is valid but delivery commit is absent or unusable. `none` additionally records `previous_snapshot_committed=true` and the prior commit checksum.

### Session state and retention

Creating a new prepared snapshot clears the session-level latest delivery and commit fields, so Memory Center cannot accidentally associate the prior turn's receipt with the new snapshot.

Snapshot retention removes the matching delivery receipt and sync sidecar together. When the current snapshot is pruned, the session restores delivery and commit metadata from the latest retained reference.

### Inventory and Memory Center

Task-Agent snapshot inventory and both Memory Center views now expose:

- committed sync baselines;
- prepared/pending snapshots;
- rejected delivery commits;
- invalid or tampered commits;
- per-row commit path, checksum, status, and validation issues.

A missing commit is a pending warning. A rejected or invalid commit is fail-closed and remains visible for diagnosis.

## Verification

New command:

```text
npm run test:task-agent-memory-snapshot-sync-commit-restart
```

The 28-check test covers:

- prepared snapshot without delivery forcing reinjection;
- failed delivery writing a durable rejected sidecar;
- rejected delivery forcing reinjection;
- successful delivery writing a committed sidecar;
- exact snapshot, sync decision, and receipt binding;
- unchanged memory allowing `none` only after commit;
- process restart restoration of the committed baseline;
- recomputed-checksum sidecar tamper rejection;
- cross-`gcs_*` rejection;
- inventory and Memory Center aggregation;
- repair establishing a fresh committed baseline.

Final focused and adjacent results:

- Phase 350 sync commit restart: 28/28;
- Phase 349 snapshot sync restart: 23/23;
- task-Agent compact-head fence: 38/38;
- task-Agent session-lifecycle fence: 31/31;
- typed-memory consumption feedback: 18/18;
- Provider access evidence restart: 12/12;
- direct durable dispatch spool: 39/39.

## Delivery milestone

With this phase, the current requested CCM memory system is deliverable end to end: multi-group and multi-session isolation, per-group-session main-Agent memory, exact child-Agent session injection, compression and recovery, Provider delivery/use evidence, and delivery-committed snapshot reuse are all implemented.

The long-term Claude Code parity goal can remain active for future upstream changes and optional refinements, but those are no longer unfinished work in this delivery milestone.
