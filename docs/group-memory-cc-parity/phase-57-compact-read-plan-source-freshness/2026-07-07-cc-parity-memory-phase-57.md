# Phase 57 - Compact Read Plan Source Freshness

## 目标

Phase 55/56 已经让 CCM 为 compact file references 生成读取计划，并审计 `read_plan_id` 是否被子 Agent 回执声明。本阶段补齐源文件新鲜度：读取计划下发时记录源文件指纹，后续 Memory Center 能发现这些源是否已经变化，避免子 Agent 使用过期压缩来源。

## 本次升级

- compact file reference 现在记录源文件状态：
  - `sourceChecksum`
  - `sourceChecksumMode`
  - `sourceMtimeMs`
  - `sourceBytes`
- `compact_file_reference_read_plan` 条目继承源文件指纹。
- surfacing ledger 的 `read_plan_entries` 保存源文件指纹。
- 子 Agent 记忆包新增 `compact_file_reference_read_plan_freshness`。
- 全局 Agent 多群聊上下文新增 read plan freshness 指标。
- Memory Center 群聊详情新增 `compactFileReferenceReadPlanFreshness`。
- Memory Center 前端新增 `Read Plan Freshness` 面板。
- 新增质量检查 `compact_file_reference_read_plan_freshness`。
- 新增自测 `runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest`。

## 行为规则

- 如果历史下发的 read plan 指向的源文件 checksum/mtime/bytes 发生变化，Memory Center 标记为 `changed`。
- changed source 不会禁止子 Agent 工作，但会要求使用前重新读取当前源，并在 `memoryUsed` / `memoryIgnored` 中声明。
- `skip_missing` 条目保持非强制读取，不作为 stale source 失败。
- 该能力只做观测和质量门禁，不扩大文件读取权限。

## Claude Code 对照

- Claude Code 的 post-compact file restore 会基于当前文件读取和 token budget 重新生成附件。
- Claude Code 对过大内容会保留 `compact_file_reference`，提醒必要时再用 Read tool。
- CCM 本阶段对应的是：read plan 不假定历史源永远有效，而是保留下发时源指纹，并在 Memory Center 中检查是否已经漂移。

## 验证

- 已通过：
  - `npm run check`
  - `npm run build:backend`
  - `runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanSelfTest`
  - `runGroupCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
  - `runMemoryCenterGroupToolContinuitySnapshotSelfTest`
  - `runMemoryCenterGroupSessionMemorySnapshotSelfTest`
  - `npm run build:mcp-feishu`
  - `npm run build:frontend`
  - `npm run test:chat-experience`
