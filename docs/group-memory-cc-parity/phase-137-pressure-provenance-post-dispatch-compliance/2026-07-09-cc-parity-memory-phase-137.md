# Phase 137: Pressure Provenance Post-Dispatch Compliance

## Goal

在 Phase 136 已经把 pressure provenance receipt discipline 前移到 WorkerContextPacket 首派发之后，继续补齐“执行后有没有真的遵守”的监督闭环。目标是让 Memory Center 能统计子 Agent 是否按首派发要求回填 `CCM_AGENT_RECEIPT.memoryProvenanceUsage`，并把违规归因到具体 `agent_type + project`，再沉淀成 typed feedback memory，供后续派发策略使用。

## Implemented

- `recordWorkerContextPacketAssignmentBindingForCoordinator` 现在会把 assignment 的 `agentType` / `agent_type` / executor 信息写入 binding ledger 的 `agent_type`，让后续合规统计可以区分 Codex、Cursor、Claude Code 等第三方子 Agent。
- `group-memory-index.ts` 新增 pressure pre-dispatch compliance 蒸馏能力：
  - ledger archive：`pressureProvenancePreDispatchComplianceArchive`
  - typed doc：`feedback/pressure-provenance-pre-dispatch-compliance.md`
  - source：`auto:pressure-provenance-pre-dispatch-compliance-distillation`
  - 记录 missing receipt、missing `memoryProvenanceUsage`、`currentSourceVerified=false` 等违反首派发纪律的高频执行器/项目组合。
- Memory Center 新增报告：
  - `buildWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceReport`
  - 从 binding ledger 找到已经携带 pre-dispatch discipline 或 acceptance provenance flags 的 WorkerContextPacket。
  - 复用 pressure provenance receipt row 解析逻辑，统计 compliant packet 与 violation packet。
  - 按 `agent_type + project` 聚合 checked/compliant/violation、missing receipt、missing usage、source verification gap。
  - 对高频违规组合触发 typed feedback memory 蒸馏，并验证 typed doc 可被 recall 命中。
- Memory Center 新增质量检查：
  - `worker_context_packet_pressure_memory_provenance_receipt_post_dispatch_compliance`
  - 当首派发已要求来源回执但子 Agent 缺回执、缺 `memoryProvenanceUsage` 或使用未验证当前来源时，检查会 fail 并给出可行动 gap。
- `getMemoryCenterOverview` 已接入新报告，把系统级/group 级告警暴露到 Memory Center overview。
- 新增自测：
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`
  - 覆盖 1 个 compliant packet、1 个 missing `memoryProvenanceUsage` packet、1 个 `currentSourceVerified=false` packet。
  - 验证违规归因、质量检查 fail、typed feedback memory 写入、typed doc 文本、recall 命中。

## Validation

- `npm run build:backend`
- Phase 137 selftest：
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPostDispatchComplianceSelfTest`: PASS
- 相邻回归：
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptPreDispatchDisciplineSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairDispatchSelfTest`: PASS
  - `runMemoryCenterWorkerContextPacketPressureMemoryProvenanceReceiptRepairTypedMemorySelfTest`: PASS
  - `runPressureMemoryProvenanceReceiptUsageSelfTest`: PASS
  - `runGroupTypedMemoryContextPressureRepairProvenanceSelfTest`: PASS
- `npm run check`
- `npm run build`
- Final dist regression set：PASS

## Stable Memory

Pressure provenance receipt 不能只做到“首派发前提示子 Agent 应该回填”。Phase 137 已把首派发后的执行结果纳入 Memory Center：凡是 WorkerContextPacket 已携带 pre-dispatch discipline 或 provenance acceptance flags，就必须在执行后检查 receipt 是否存在、`memoryProvenanceUsage` 是否结构化回填、`currentSourceVerified` 是否为 true。违反者会按 `agent_type + project` 归因，并写入 `feedback/pressure-provenance-pre-dispatch-compliance.md`，让群聊主 Agent 后续派发时知道哪些第三方执行器/项目组合需要更强约束或修复提示。

## Next Direction

下一阶段继续贴近 Claude Code 式记忆系统：把 Phase 137 的高频违规 feedback memory 反向注入 dispatch policy，让群聊主 Agent 在给特定子 Agent/项目派任务前自动加强 contract、降低高风险 pressure memory 的使用权限，或生成专属修复任务。
