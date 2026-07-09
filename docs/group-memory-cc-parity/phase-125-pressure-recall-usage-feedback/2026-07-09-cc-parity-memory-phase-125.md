# Phase 125 - Pressure Recall Usage Feedback

Date: 2026-07-09

## Goal

Close the loop after Phase 124 pressure-aware typed memory recall.

Before this phase, CCM could boost WorkerContextPacket pressure repair `MEMORY.md` documents into a fresh child Agent context when the packet was `compact_recommended`, `critical`, or `over_budget`. The missing piece was receipt feedback: after a child Agent saw pressure-boosted typed memory, CCM did not persist whether the Agent actually used, ignored, or verified those docs, so future pressure recall could not learn from real child Agent behavior.

## Implemented

- Added a per-group pressure recall usage ledger:
  - `.pressure-recall-usage-ledger.json`
  - stored under the group typed memory directory
  - records `used`, `ignored`, `verified`, and `mentioned` states for pressure-boosted typed `MEMORY.md`
- Added usage summary and scoring helpers in `backend/modules/collaboration/group-memory-index.ts`.
- Fed pressure recall usage history back into `buildGroupTypedMemoryRecall`.
- Added per-document `workerContextPressureUsage` scoring and top-level `workerContextPressureUsageScoring`.
- Updated rendered typed memory recall output to show `pressure usage +/-N` when history affects recall.
- Extended WorkerContextPacket child Agent instructions so pressure recall docs must be cited in `CCM_AGENT_RECEIPT.memoryUsed` or `memoryIgnored`.
- Added task delivery summary feedback ingestion in `backend/modules/collaboration/collaboration.ts`.
- Persisted pressure typed memory recall summaries into assignment binding ledgers from `backend/modules/collaboration/group-orchestrator.ts`.
- Added MCC quality check:
  - `worker_context_packet_pressure_recall_typed_memory_usage`
  - high-pressure WorkerContextPackets must have pressure typed memory recall
  - pressure recalled docs must eventually receive `memoryUsed` or `memoryIgnored` ledger feedback

## Acceptance

New selftest:

- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`

Key checks:

- High-pressure WorkerContextPacket without pressure typed memory recall fails.
- WorkerContextPacket with pressure typed memory recall but no receipt feedback warns.
- Usage ledger rows close the loop and make the MCC check pass.
- Ledger persists both `used` and `ignored` rows.

Updated selftest:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`

New checks in that selftest:

- future pressure recall boosts previously used or verified pressure docs;
- future pressure recall deprioritizes previously ignored pressure docs;
- usage summary is exposed through `workerContextPressureUsageScoring`.

Regression checks passed:

- `runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest`
- `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`

## Stable Memory

CCM pressure-aware typed memory recall now has a receipt feedback loop. When a fresh third-party child Agent session receives pressure-boosted `MEMORY.md` docs, its `CCM_AGENT_RECEIPT.memoryUsed` and `memoryIgnored` values can be mapped back to the exact typed memory documents. Future high-pressure recall then promotes pressure docs that were used or verified, and deprioritizes pressure docs that were repeatedly ignored.

This moves the group memory system closer to Claude Code style context behavior: memory is not only compressed and injected, but also measured after use and reused with feedback.

## Next Direction

Next parity work should make this feedback more predictive:

- add stale pressure recall aging so old usage feedback decays safely;
- add cross-group/global pressure recall hints for recurring project Agent behavior;
- expose pressure recall usage health in the Memory Center UI;
- connect pressure usage feedback to partial compact policy selection, so the system can choose compact strategy memories based on what previously recovered real WorkerContextPackets.
