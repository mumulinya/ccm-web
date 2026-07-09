# Phase 136: Pressure Provenance Pre-Dispatch Discipline

## Goal

把 Phase 135 的 pressure memory provenance receipt repair typed memory 从“事后修复和蒸馏”前移到“首派发上下文 shaping”。当 WorkerContextPacket 召回 disputed/stale-under-repair pressure MEMORY.md 时，子 Agent 第一次收到任务前就应看到完整 `memoryProvenanceUsage` 回执纪律和可复制示例，减少后续 repair item。

## Implemented

- `buildAgentMemoryContextBundle` 现在会从 typed recall 的 pressure repair provenance match 生成：
  - `pressure_memory_provenance_receipt_discipline`
  - schema：`ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1`
  - required fields：`relPath`、`usageState`、`provenanceStatus`、`repairWorkItemId`、`repairStatus`、`repairGapType`、`currentSourceVerified`
  - `exampleRows`：可复制到 `CCM_AGENT_RECEIPT.memoryProvenanceUsage`
- `renderGroupMemoryContextBundle` 现在在 pressure repair 出现时渲染完整 pre-dispatch discipline，不再只提示部分字段。
- `buildWorkerContextPacket` 现在会提取并保存该 discipline，并在 acceptance 中声明：
  - `memory_provenance_usage_required=true`
  - `pressure_memory_provenance_receipt_required=true`
- `renderWorkerContextPacket` 现在单独渲染 `Pressure memory provenance receipt discipline`，避免记忆正文截断时丢失回执要求。
- `buildWorkerContextUsage` 新增 required category：
  - `pressure_memory_provenance_receipt_discipline`
- `recordWorkerContextPacketAssignmentBindingForCoordinator` 现在把该 discipline 和 render probe flags 写入 binding ledger。
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_memory_provenance_receipt_pre_dispatch_discipline`
  - 检查真实 binding ledger 中 pressure provenance recall 是否已在首派发前带 discipline、acceptance gate、usage category 和 `memoryProvenanceUsage` 示例。

## Validation

- `npm run build:backend`
- Phase 136 selftest：
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`: PASS
- 相邻回归：
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
- `npm run check`
- `npm run build`
- Final dist regression set：PASS

## Stable Memory

Pressure under-repair typed MEMORY.md 不能只在子 Agent 回执缺失后靠 repair 补救。Phase 136 已把 discipline 前移到 WorkerContextPacket 首派发：只要 typed recall 中出现 disputed/stale-under-repair pressure memory，packet 必须携带 `ccm-pressure-memory-provenance-receipt-pre-dispatch-discipline-v1`，acceptance 必须要求 `memoryProvenanceUsage`，context usage 必须把该 discipline 作为 required category，渲染文本必须包含可复制的 `CCM_AGENT_RECEIPT.memoryProvenanceUsage` 示例。

## Related Fix

本轮构建时发现 `group-routes.ts` 中独立复核 helper 位于调用点后但未被 TypeScript 正确解析。已将 `getGroupStatusIndependentReviewSummary` / `summarizeGroupStatusIndependentReview` 及其小 helper 上移到 `buildGroupMainAgentStatus` 前，语义不变，仅恢复编译。

## Next Direction

下一阶段可以继续向 Claude Code 式记忆使用靠近：对 pre-dispatch discipline 做“执行后达成率”统计，把首次派发已提示但子 Agent 仍缺 `memoryProvenanceUsage` 的情况归因到具体第三方执行器/项目，并把高频违约执行器写入 typed feedback memory 和主 Agent dispatch policy。
