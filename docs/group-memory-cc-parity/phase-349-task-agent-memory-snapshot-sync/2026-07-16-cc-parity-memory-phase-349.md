# Phase 349 - Task Agent Memory Snapshot Sync

## Goal

Give every exact third-party child-Agent session a durable answer to a question that the existing snapshot chain did not explicitly record: is this the first memory baseline, is the group-session memory unchanged, or did CCM have to inject an updated baseline?

The identity boundary remains `group + gcs_* + task + tas_* + project`. A `tas_*` that has adopted one `gcs_*` must never be rebound to another group chat session.

## Claude Code comparison

The reference is `D:\claude-code\src\tools\AgentTool\agentMemorySnapshot.ts`.

Claude Code checks a project Agent-memory snapshot against locally synchronized metadata and returns one of three actions:

- `initialize` when no local memory exists;
- `prompt-update` when a newer or untrusted snapshot needs attention;
- `none` when the synchronized baseline is current.

CCM already persisted a stronger prompt-bound `ccm-task-agent-memory-context-snapshot-v1`, but it did not preserve the equivalent transition decision. Phase 349 adds this semantic layer without copying memory across group sessions.

## Implementation

### Checksummed sync decision

Each new task-Agent memory snapshot now contains `ccm-task-agent-memory-snapshot-sync-v1` with:

- `initialize`, `prompt_update`, or `none` action;
- exact group, `gcs_*`, task, `tas_*`, project, and turn binding;
- current and previous memory-context checksums;
- previous snapshot identity and trust state;
- whether memory injection is required;
- a separate SHA-256 sync checksum.

The previous snapshot is trusted only when both layers validate:

1. the outer task-Agent memory snapshot checksum and identity;
2. the inner memory-snapshot sync checksum and identity.

A legacy snapshot or a snapshot with tampered sync metadata therefore forces one `prompt_update` before it can become a new trusted baseline.

### Exact session isolation

`TaskAgentSession` now persists the adopted `groupSessionId`. Binding the same `tas_*` to a different `gcs_*` throws `TASK_AGENT_MEMORY_SNAPSHOT_CROSS_SESSION_REJECTED` before a snapshot file is written.

The guard also checks trusted snapshot history, so process restart does not weaken the boundary.

### Inventory and Memory Center

Task-Agent snapshot inventory revalidates the inner decision and exposes:

- initialize count;
- prompt-update count;
- unchanged count;
- invalid sync count;
- legacy snapshot count;
- per-row action, reason, previous snapshot, checksum, and validation issues.

Memory Center shows a `snapshot sync` card in both fleet and selected-group views. Existing legacy snapshots stay visible without being reclassified as broken; their first future continuation establishes the upgraded baseline.

## Verification

New command:

```text
npm run test:task-agent-memory-snapshot-sync-restart
```

The 23-check test covers:

- first-session initialize;
- unchanged-memory no-op;
- changed-memory prompt update;
- sync checksum and exact identity verification;
- cross-`gcs_*` rejection without persistence;
- inventory aggregation;
- inner metadata tamper while the outer snapshot remains valid;
- process restart restoration;
- forced reinjection from an untrusted previous snapshot;
- stable baseline after repair;
- Memory Center aggregation and row visibility.

Adjacent compact-head, session-lifecycle, typed-memory consumption, provider access evidence, and durable-dispatch tests are run before release validation.

Final results:

- snapshot sync restart: 23/23;
- task-Agent compact-head fence: 38/38;
- task-Agent session-lifecycle fence: 31/31;
- typed-memory consumption feedback: 18/18;
- provider access evidence restart: 12/12;
- direct durable dispatch spool: 39/39;
- full frontend, Feishu MCP, and backend build;
- backend and Feishu MCP TypeScript checks;
- documentation catalog generation and 1,028 link checks;
- Memory Center desktop/mobile inspection with no document overflow or console errors.

The Windows lifecycle selftest also now treats a temporary SQLite `EBUSY` during final fixture deletion as deferred cleanup after all assertions have passed, instead of misreporting a memory-lifecycle failure.

## Boundary

This decision proves which memory baseline CCM selected for the exact child-Agent session. It does not by itself prove model reasoning used the memory correctly; provider read evidence and typed-memory consumption receipts continue to provide those separate lifecycle layers.
