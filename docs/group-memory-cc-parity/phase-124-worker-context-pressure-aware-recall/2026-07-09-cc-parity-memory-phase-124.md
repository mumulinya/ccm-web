# Phase 124 - WorkerContextPacket Pressure-Aware Typed Memory Recall

Date: 2026-07-09

## Goal

Move CCM group typed memory closer to Claude Code style context use by making recall aware of WorkerContextPacket pressure.

Before this phase, CCM could distill context usage repair, compact strategy, and PTL emergency downgrade into typed `MEMORY.md` documents, but recall treated those memories mostly like normal text matches. That meant pressure repair memories could either fail to appear when a fresh child Agent session was over budget, or pollute ordinary child Agent context when no pressure existed.

## Implemented

- Added WorkerContextPacket pressure signal normalization in `backend/modules/collaboration/group-memory-index.ts`.
- Added pressure-aware recall scoring for these typed memory families:
  - `worker-context-usage-pressure-discipline`
  - `worker-context-compact-strategy-memory`
  - `worker-context-compact-strategy-cautions`
  - `worker-context-ptl-emergency-downgrade`
- Added active boosts for:
  - `context_usage.status` of `compact_recommended`, `critical`, or `over_budget`
  - `pressure >= 82`
  - negative `free_tokens`
  - PTL emergency engagement
  - repeated compact failure / blocked compact outcomes
- Added mild deprioritization for WorkerContextPacket pressure repair memories when no pressure signal exists, so ordinary child Agent tasks do not lose typed memory slots to budget repair notes.
- Added recall diagnostics under `workerContextPressureScoring` and per-document `workerContextPressureRecall`.
- Updated rendered typed memory recall text to show `pressure recall +N` when a memory was surfaced because of active pressure.
- Passed group memory pressure/PTL/compact strategy state into typed memory recall from:
  - child Agent memory bundles
  - global multi-group memory bundles

## Acceptance

New selftest:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`

Key checks:

- No pressure: normal task memory wins and pressure repair docs are deprioritized.
- Over budget: context usage discipline and compact strategy memory are boosted.
- PTL emergency: emergency downgrade memory is boosted.
- Rendered recall mentions pressure-aware recall.

Regression checks passed:

- `runGroupTypedMemoryPostCompactUsageScoringSelfTest`
- `runGroupTypedMemoryPostCompactUsageDistillationSelfTest`
- `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

## Stable Memory

CCM typed memory recall is now pressure-aware. WorkerContextPacket pressure repair memories should be surfaced only when current or group-level pressure signals justify them, and suppressed during normal child Agent task dispatch. This keeps fresh third-party child Agent sessions focused while still giving them the right compact/repair/PTY downgrade guidance when context pressure appears.

## Next Direction

Next parity work should close the loop after recall:

- record whether pressure-boosted typed memories were actually used or ignored by the child Agent receipt;
- feed those receipts back into future pressure-aware recall;
- add an MCC quality check that fails if an over-budget WorkerContextPacket does not surface any relevant pressure repair typed memory.
