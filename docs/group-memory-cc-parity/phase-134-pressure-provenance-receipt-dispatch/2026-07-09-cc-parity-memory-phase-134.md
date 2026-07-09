# Phase 134 - Pressure Provenance Receipt Repair Dispatch

## Goal

把 Phase 133 的 `worker_context_pressure_memory_provenance_receipt_repair` 从 Memory Center repair work item 推进到主 Agent 可派发链路：主 Agent 能看到 candidate，能生成 corrected-receipt worker brief，并把 `memoryProvenanceUsage`、`repairWorkItemId`、`currentSourceVerified` 约束带进后续子 Agent 会话上下文。

## Implemented

- Replay repair dispatch candidate now preserves pressure provenance metadata:
  - `pressure_memory_provenance_gap_codes`
  - `pressure_memory_provenance_repair_work_item_ids`
  - `pressure_memory_provenance_rel_paths`
- `buildReplayRepairDispatchBriefForCoordinator` now has a dedicated branch for:
  - `source=worker_context_pressure_memory_provenance_receipt_repair`
  - It generates a corrected `CCM_AGENT_RECEIPT.memoryProvenanceUsage` worker task.
  - It requires `relPath`, `usageState`, `provenanceStatus`, `repairWorkItemId`, `repairStatus`, `repairGapType`.
  - It requires `currentSourceVerified=true` when disputed/stale-under-repair memory is used or verified.
- Memory Center added two quality checks:
  - `worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_candidates`
  - `worker_context_packet_pressure_memory_provenance_receipt_repair_dispatch_briefs`
- Memory Center overview now reports and alerts on missing pressure provenance receipt dispatch candidates/briefs.
- Child memory bundle rendering now surfaces pressure provenance candidate metadata inline:
  - `pressureDocs=...`
  - `pressureRepair=...`
- New selftest:
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`

## Validation

- `npm run build:backend`
- `npm run check`
- `npm run build`
- Dist selftests passed:
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`
  - `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`
  - `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`

## Stable Memory

Pressure memory provenance repair is no longer only a diagnostic sidecar. Missing or unsafe `memoryProvenanceUsage` now becomes:

1. a repair work item,
2. a main Agent dispatch candidate,
3. a ready corrected-receipt worker brief,
4. visible child-context candidate metadata.

This moves CCM closer to Claude Code style memory reliability: compressed/typed memory can be injected into fresh child Agent sessions, and disputed memory must be proven or explicitly ignored through structured receipts.

## Next Direction

The next useful upgrade is typed memory distillation for pressure provenance receipt repairs: once corrected receipt candidates/briefs exist, archive repeated gaps into MEMORY.md discipline so future child Agent prompts learn the rule before the quality gate has to repair them.
