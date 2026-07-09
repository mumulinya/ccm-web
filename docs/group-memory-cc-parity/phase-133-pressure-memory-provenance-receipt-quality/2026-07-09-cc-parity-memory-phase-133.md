# Phase 133 - Pressure Memory Provenance Receipt Quality

## Goal

把 Phase 130-132 已经下发到子 Agent 上下文里的 pressure repair provenance，升级成 Memory Center 可审计的质量门：只要 WorkerContextPacket 给子 Agent 展示了 `disputed_under_repair`、`stale_evidence_under_repair` 或 `repair_work_item_id`，子 Agent 就必须在 `CCM_AGENT_RECEIPT.memoryProvenanceUsage` 中逐条声明使用状态、来源状态、修复工单和当前源核验。

## Implemented

- `group-orchestrator.ts` 的 `worker_context_packet_typed_memory_pressure_recall.docs` 现在会保留 pressure usage provenance：
  - `pressure_usage_adjustment`
  - `pressure_usage_recommendation`
  - `pressure_usage_matches`
  - `provenance_status`
  - `repair_work_item_id`
  - `repair_status`
  - `repair_gap_type`
  - `requires_memory_provenance_usage`
- `memory-control-center.ts` 新增 `worker_context_packet_pressure_memory_provenance_receipts` 质量检查。
- Memory Center 会按 group/project/packet 统计：
  - provenance doc count
  - required provenance doc count
  - structured receipt row count
  - trusted/disputed/stale-under-repair/verified-under-repair count
  - missing receipt / missing `memoryProvenanceUsage` / unsafe disputed use count
- 当缺少结构化回执、缺少 repair work item id，或 disputed/stale-under-repair 记忆被 used/verified 但没有 `currentSourceVerified=true` 时，会写入 replay repair work item：
  - `source=worker_context_pressure_memory_provenance_receipt_repair`
  - `component=worker_context_pressure_memory_provenance_receipt_contract`
- Memory Center overview 会把该检查加入系统告警和 group health。
- 新增自测 `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`，覆盖：
  - 缺结构化 provenance 回执时 fail 并创建 repair work item
  - 只有泛化 `memoryUsed` 时仍 fail
  - structured row 存在但未声明 `currentSourceVerified=true` 时 warn
  - 补齐结构化 row 后 ok，并关闭 repair work item

## Validation

- `npm run build:backend`
- `npm run check`
- `npm run build`
- Dist selftests passed:
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`
  - `runGroupTypedMemoryPressureRecallUsageRepairProvenanceSelfTest`
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
  - `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageRepairWorkItemsSelfTest`
  - `runMemoryCenterWorkerContextPacketCrossGroupPressureRecallUsageSelfTest`

## Stable Memory

CCM 的 pressure typed memory provenance 已经从“上下文提示”升级为“回执质量门”。以后 under-repair 的 pressure MEMORY.md 不能只靠子 Agent 泛化声称 used/ignored，必须在 `memoryProvenanceUsage` 中逐条结构化声明；Memory Center 会把缺口转成群聊主 Agent 可认领的 repair work item。

## Next Direction

下一阶段可以继续向 Claude Code 记忆压缩方向推进：把 `worker_context_pressure_memory_provenance_receipt_repair` 的 open work item 自动进入主 Agent dispatch candidate/brief 流程，让主 Agent 在下一轮派发前主动要求子 Agent 补交 corrected receipt，而不是只在 Memory Center 中显示。
