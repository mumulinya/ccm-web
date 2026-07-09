# Phase 135: Pressure Provenance Receipt Repair Typed Memory

## Goal

把 pressure memory provenance receipt repair 的反复缺口沉淀为 typed `MEMORY.md`，让后续每个第三方项目子 Agent 新会话在收到 disputed/stale-under-repair pressure memory 时，能主动召回 `memoryProvenanceUsage`、`repairWorkItemId`、`provenanceStatus` 和 `currentSourceVerified=true` 的回执纪律，而不是等 Memory Center 再事后修复。

## Implemented

- 在 `group-memory-index` 中新增 pressure provenance receipt repair distillation：
  - ledger 字段：`pressureMemoryProvenanceReceiptRepairArchive`
  - schema：`ccm-pressure-memory-provenance-receipt-repair-distillation-v1`
  - typed doc：`pressure-memory-provenance-receipt-discipline.md`
  - source：`auto:pressure-memory-provenance-receipt-repair-distillation`
- 在 Memory Center 中新增 typed-memory report/evaluator：
  - `buildWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemoryReport`
  - `evaluateWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemory`
  - quality check id：`worker_context_packet_pressure_memory_provenance_receipt_repair_typed_memory`
- 将该检查接入 `memoryQualityCheckDescriptors`，并接入 Memory Center overview：
  - overview 会生成 `workerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemoryReport`
  - fail/warn 时产生 system 和 group alert
  - overview 返回体暴露该 report，前端/API 可读取
- 新增自测 `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest`：
  - 构造 pressure typed memory recall 中 `disputed_under_repair` 的文档
  - 模拟子 Agent 使用该 memory 但缺少结构化 `memoryProvenanceUsage`
  - 验证 repair item、dispatch candidate、corrected brief 生成
  - 验证 typed `MEMORY.md` 写入、archive 计数、recall probe 命中

## Validation

- `npm run build:backend`
- Phase 135 dist selftest：PASS
- 相邻回归：
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
- `npm run check`
- `npm run build`
- Final dist regression set：PASS

## Stable Memory

当 WorkerContextPacket 在 pressure 状态下给子 Agent 下发 disputed/stale-under-repair typed `MEMORY.md`，子 Agent 的最终 `CCM_AGENT_RECEIPT` 必须包含结构化 `memoryProvenanceUsage`。每条使用记录至少要保留 `relPath`、`usageState`、`provenanceStatus`、`repairWorkItemId`、`repairStatus`、`repairGapType`；如果 disputed/stale-under-repair memory 被 used/verified，必须声明 `currentSourceVerified=true`。Phase 135 已把缺失该回执纪律的 repair chain 自动沉淀到 typed memory，并通过 recall probe 证明后续子 Agent 会话能召回。

## Next Direction

下一阶段可以把这种 typed-memory distillation 从“repair 后沉淀”继续前移到“pre-dispatch context shaping”：当 pressure recall 中出现 disputed/stale-under-repair 文档时，主 Agent 在首次派发前就把相应 typed feedback discipline 和示例 receipt block 放入子 Agent brief，减少 repair item 的产生率。
