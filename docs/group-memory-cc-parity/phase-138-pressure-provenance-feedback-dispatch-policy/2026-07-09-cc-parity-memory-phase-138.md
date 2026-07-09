# Phase 138: Pressure Provenance Feedback Dispatch Policy

## Goal

把 Phase 137 沉淀出来的 `feedback/pressure-provenance-pre-dispatch-compliance.md` 从“事后可读反馈记忆”升级为“下一次派发前自动生效的 WorkerContextPacket dispatch policy”。当某个 `agent_type + project` 历史上多次收到 pressure provenance discipline 但仍遗漏 `memoryProvenanceUsage` 或 `currentSourceVerified` 时，群聊主 Agent 后续派发给同一执行器/项目组合前必须自动加强 ACK、回执和关闭门禁。

## Implemented

- `group-memory-index.ts` 新增：
  - `buildPressureProvenancePreDispatchComplianceDispatchPolicy`
  - 从 `pressureProvenancePreDispatchComplianceArchive` 读取高频违规 attribution。
  - 匹配 `agentType + targetProject` 后生成结构化 policy：
    - schema：`ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1`
    - action：`strengthen_pressure_memory_provenance_receipt_contract`
    - required fields：`memoryProvenanceUsage`、`relPath`、`usageState`、`provenanceStatus`、`repairWorkItemId`、`repairStatus`、`repairGapType`、`currentSourceVerified`
    - close gate：`do_not_close_until_memoryProvenanceUsage_is_present_or_explicitly_empty_with_reason`
- 修复普通群聊日志蒸馏覆盖专项 archive 的问题：
  - `distillGroupMessagesToTypedMemory` 现在通过 `preservedGroupTypedMemoryDistillationArchives` 保留已有专项反馈 archive。
  - 覆盖范围包括 provider re-proof、ignore-memory repair、pressure provenance repair、pressure pre-dispatch compliance、context usage repair、compact strategy、PTL emergency 等 archive。
- `buildAgentMemoryContextBundle` 现在会把 matching feedback policy 写入：
  - `pressure_provenance_dispatch_feedback_policy`
  - `group_state.typedMemory.pressureProvenanceDispatchFeedbackPolicy`
  - 渲染文本中的 `pressure provenance dispatch feedback policy` 提示。
- `buildWorkerContextPacket` 现在会提取并承载该 policy：
  - 顶层字段：`pressure_provenance_dispatch_feedback_policy`
  - `agent_type` / `agentType`
  - acceptance flags：
    - `pressure_provenance_feedback_ack_required`
    - `pressure_provenance_feedback_final_receipt_review_required`
  - context usage category：
    - `pressure_provenance_dispatch_feedback_policy`
    - source：`typed-feedback-memory`
    - active 时 required=true
- `renderWorkerContextPacket` 现在单独渲染 `Pressure provenance dispatch feedback policy`，即使群聊记忆正文被压缩，也不会丢失执行器/项目级强化合同。
- `recordWorkerContextPacketAssignmentBindingForCoordinator` 现在把该 policy 和 rendered probe flag 写入 binding ledger。
- `worker-handoff.ts` 现在把 `agentType` 传给 WorkerContextPacket，方便后续 attribution 和 policy 匹配。
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_provenance_feedback_dispatch_policy`
  - 当 archive 中已有高频违规 attribution 时，检查后续 matching WorkerContextPacket 是否已注入 feedback dispatch policy。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest`
  - 覆盖 feedback archive 保留、bundle 注入、packet 注入、context usage 记账、handoff 渲染、binding 持久化和 Memory Center quality pass。

## Validation

- `npm run build:backend`
- Phase 138 selftest：
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackDispatchPolicySelfTest`: PASS
- 相邻回归：
  - `runAgentRuntimeKernelSelfTest`: PASS
  - `runWorkerContextUsageSelfTest`: PASS
  - `runWorkerHandoffSelfTest`: PASS
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
- `npm run check`
- `npm run build`
- Final dist regression set：PASS

## Stable Memory

Phase 137 的 feedback typed memory 不能只作为人工可读文档存在。Phase 138 已把高频 `agent_type + project` 违约归因反向注入后续 WorkerContextPacket：只要 `pressureProvenancePreDispatchComplianceArchive` 里存在 matching frequent attribution，后续同一执行器/项目的派发包必须携带 `ccm-pressure-provenance-pre-dispatch-compliance-dispatch-policy-v1`，并在 acceptance、context usage、渲染文本和 binding ledger 中留下结构化证据。

普通 `distillGroupMessagesToTypedMemory` 不能覆盖专项 feedback archives。任何后续日志蒸馏都必须保留 pressure provenance compliance、repair、ignore-memory、context usage、compact strategy、PTL emergency 等专项 archive，否则主 Agent 会失去长期学习子 Agent 记忆使用行为的能力。

## Next Direction

下一阶段继续靠近 Claude Code 式记忆系统：把 feedback dispatch policy 从“加强回执合同”推进到“派发策略调度”。例如，当某执行器/项目持续违反记忆来源合同时，主 Agent 可以自动降低 disputed/stale pressure MEMORY.md 权重、要求先生成修复任务、或在多执行器可选时优先选择历史合规率更高的子 Agent。
