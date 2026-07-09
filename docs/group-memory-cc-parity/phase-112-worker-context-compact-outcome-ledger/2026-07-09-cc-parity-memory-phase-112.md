# Phase 112 - WorkerContextPacket Compact Outcome Ledger

## Goal

Move CCM closer to Claude Code-style memory compaction by preserving long-term samples of WorkerContextPacket compaction outcomes. Earlier phases could choose a pressure-aware partial compact policy and record hook attempts, but the system still lacked a durable outcome history that could later teach the memory layer which categories usually recover budget and which categories repeatedly fail.

## What Changed

- Added a long-term sidecar ledger under `~/.cc-connect/group-memory-worker-context-compact-outcomes/`.
- Added schema identity:
  - `ccm-worker-context-compact-outcome-ledger-v1`
  - `ccm-worker-context-compact-outcome-entry-v1`
- The group orchestrator now appends compact outcome entries from the WorkerContextPacket post-hook path.
- Outcome entries preserve the compact strategy, selected/skipped partial compact categories, over-budget state, task hash behavior, task compaction state, memory-first state, repair/replay/metadata state, and recovery result.
- Memory Center now reads and reports `worker_context_packet_compact_outcome_ledger`.
- Memory Center quality checks can flag missing or malformed compact outcome ledgers.
- Added orchestrator and Memory Center selftests for the outcome ledger path.

## Why It Matters

Project child Agents start fresh third-party sessions, so the main group Agent must send a compact, explainable, and recoverable WorkerContextPacket every time. The compact hook ledger records that a retry happened; the outcome ledger records what happened after the retry and why that outcome matters.

This gives CCM a durable learning surface:

- which memory categories tend to cause budget pressure,
- which categories can be partially compacted without needing task compaction,
- when task hash remained unchanged and task compaction was correctly skipped,
- which retry paths still fail and should later trigger stronger downgrade or repair policies.

## Recovery Contract

The outcome ledger complements, not replaces, the compact hook ledger.

- Compact hook ledger: attempt-level before/after hook telemetry.
- Compact outcome ledger: durable result samples for future strategy distillation.
- Pre-dispatch over-budget hold remains authoritative unless retry recovers the packet.
- `autoWorkerContextCompactRetry=false` still preserves hard hold behavior.
- If task hash is unchanged, outcome rows must preserve `task_hash_unchanged=true` and `task_compacted=false`.
- Partial compaction must continue to preserve receipt/proof/request/runner identifiers and real-task suppression semantics.

## Validation

Passed:

- `npm run build:backend`
- `npm run check`
- `npm run build`
- `runWorkerContextCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- Regression selftests for partial compact policy, metadata partial compact retry, replay brief partial compact retry, memory-first retry, compact retry, pre-dispatch gate, compact hook ledger, memory reinjection proof, WorkerContextPacket usage, coordinator protocol, and runtime kernel.

## Follow-Up Direction

- Distill compact outcome ledger rows into typed strategy memory.
- Promote repeated failed compact outcomes into PTL-style emergency downgrade hints.
- Feed successful category-level outcomes back into the partial compact policy.
- Continue improving ignore-memory semantics for sessions that intentionally suppress recall.
