# Phase 126 - Pressure Recall Usage Aging

Date: 2026-07-09

## Goal

Make Phase 125 pressure recall usage feedback safer over time.

Before this phase, `.pressure-recall-usage-ledger.json` stored whether pressure-boosted typed `MEMORY.md` documents were used, ignored, or verified, and future recall used those counts directly. That closed the feedback loop, but old receipts could permanently promote or suppress a pressure memory even after the project, task style, or child Agent behavior changed.

## Implemented

- Added pressure recall usage aging defaults in `backend/modules/collaboration/group-memory-index.ts`:
  - half-life: 21 days
  - stale threshold: 60 days
- Added weighted aggregation from ledger entries:
  - raw totals remain available for audit;
  - weighted totals are used for recall recommendations;
  - old-only weak evidence becomes `stale_pressure_recall_history`.
- Added summary fields to `buildGroupTypedMemoryPressureRecallUsageSummary`:
  - `weighted_totals`
  - `aging`
  - `stale_pressure_memories`
- Updated pressure recall usage scoring so stale history has `delta=0`.
- Added recall diagnostics:
  - `stale_hint_count`
  - `stale_matched_count`
- Extended MCC pressure recall usage report in `backend/modules/knowledge/memory-control-center.ts`:
  - `staleUsageEntryCount`
  - `freshUsageEntryCount`
  - `staleUsageMemoryCount`
  - `usageWeightedTotals`
  - `usageRawTotals`
  - `usageAging`

## Acceptance

Updated selftests:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`

New checks:

- old ignored pressure recall rows decay before scoring;
- stale-only pressure recall history is surfaced as stale instead of applying a negative adjustment;
- MCC exposes stale and fresh usage entry counts;
- MCC exposes weighted totals lower than raw totals when old rows exist.

Regression checks passed:

- `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation:

- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`

## Stable Memory

Pressure recall usage feedback is now time-aware. CCM keeps raw pressure memory receipt history for audit, but recall scoring uses decayed weighted counts. A stale ignored or used receipt no longer permanently suppresses or promotes a typed `MEMORY.md`; old-only weak evidence is marked as `stale_pressure_recall_history` and contributes no score delta.

This moves CCM closer to Claude Code style memory behavior: context memory is not just compressed, injected, and measured, but allowed to cool down when it stops matching current work.

## Next Direction

Next parity work should connect this aged feedback to action selection:

- feed `usageWeightedTotals` into partial compact policy ranking;
- expose pressure recall aging health in the Memory Center UI;
- add cross-group/global pressure recall hints so recurring project Agent behavior can transfer between groups without leaking stale local evidence;
- add a repair work item when high-pressure packets repeatedly surface stale pressure memories without fresh child Agent receipt feedback.
