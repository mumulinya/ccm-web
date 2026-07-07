# Phase 56 - Compact Read Plan Receipt Discipline

## 目标

Phase 55 已经让 CCM 在 compact file references 旁生成 `compact_file_reference_read_plan`，本阶段补齐使用闭环：当读取计划下发给第三方子 Agent 新会话后，Memory Center 必须能审计后续 `memoryUsed` / `memoryIgnored` 是否声明了 `read_plan_id`。

## 本次升级

- compact file reference surfacing ledger 现在保存 `read_plan_entries`。
- 子 Agent 记忆包新增 `compact_file_reference_read_plan_access`。
- 全局 Agent 多群聊上下文新增 read plan access 统计。
- Memory Center 群聊详情新增：
  - `compactFileReferenceReadPlanAccess`
  - `compactFileReferenceReadPlanDiscipline`
- Memory Center 前端新增 `Read Plan Receipt` 面板。
- 新增质量检查 `compact_file_reference_read_plan_usage_discipline`。
- 新增自测 `runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest`。

## 规则

- 子 Agent 读取或决定不读取 compact read plan 条目后，应在 `CCM_AGENT_RECEIPT.memoryUsed` 或 `memoryIgnored` 中声明 `read_plan_id`。
- `reference_id` 或路径的声明仍可作为间接证据，但 read plan discipline 会把未声明 `read_plan_id` 的条目标为 gap。
- 该检查只做观测和质量门禁，不强制读取文件，也不扩大文件读取权限。

## Claude Code 对照

- Claude Code 的 `compact_file_reference` 会在压缩后提醒模型必要时再使用 Read tool。
- CCM Phase 55 对齐了“按需读取计划”。
- CCM Phase 56 继续补齐“计划被下发后是否在回执中显式消费”的审计闭环。

## 验证

- 已通过：
  - `npm run check`
  - `npm run build:backend`
  - `runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceSelfTest`
  - `runMemoryCenterGroupToolContinuitySnapshotSelfTest`
  - `runMemoryCenterGroupSessionMemorySnapshotSelfTest`
  - `runGroupCompactFileReferenceReadPlanSelfTest`
  - `npm run build:mcp-feishu`
  - `npm run build:frontend`
  - `npm run test:chat-experience`
