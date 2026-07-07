# Phase 55 - Compact File Reference Read Plan

## 目标

继续对齐 Claude Code 的 post-compact file attachment 思路。Claude Code 在压缩后不会把所有大文件内容塞回上下文，而是保留 `compact_file_reference`，提醒模型必要时再用 Read 工具读取。本阶段让 CCM 的群聊记忆系统也具备同类能力：compact file references 下发后，同时生成结构化按需读取计划。

## 本次升级

- 新增 `buildGroupCompactFileReferenceReadPlan`。
- 子 Agent 记忆包新增 `compact_file_reference_read_plan`。
- 全局 Agent 多群聊上下文新增 per-group compact read plan。
- 子 Agent 渲染文本新增 `read_plan_id`、读取优先级、读取动作和回执要求。
- Memory Center 群聊详情新增 `compactFileReferenceReadPlan`。
- Memory Center 前端新增 `Compact Read Plan` 面板。
- 新增质量检查 `compact_file_reference_read_plan`。
- 新增自测：
  - `runGroupCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanSelfTest`

## 读取计划规则

- 优先读取 `group_session_memory`，用来恢复压缩后的会话目标、约束和近期结论。
- 当摘要不足、冲突或需要核对用户原话时，再读取 `raw_group_messages_json`。
- 需要长期类型化记忆时，先读 `typed_memory_index`，再按任务读取具体文档。
- `typed_memory_dir` 只作为目录入口，不鼓励全量读取。
- 每个读取或忽略决定都应在 `CCM_AGENT_RECEIPT.memoryUsed` 或 `memoryIgnored` 中引用 `read_plan_id`、`reference_id` 或路径。

## Claude Code 对照

- `D:\claude-code\src\utils\attachments.ts` 定义 `compact_file_reference` 附件。
- `D:\claude-code\src\utils\messages.ts` 将该附件渲染为“之前读过但太大，必要时使用 Read tool”的提醒。
- `D:\claude-code\src\services\compact\compact.ts` 的 post-compact file restore 会按最近访问、保留尾部和 token budget 决定是否重新注入文件内容。
- CCM 本阶段的对应能力是：不强塞文件内容，而是为第三方子 Agent 新会话生成可审计的读取计划。

## 验证

- 已通过：
  - `npm run check`
  - `npm run build:backend`
  - `runGroupCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceSelfTest`
  - `runMemoryCenterGroupToolContinuitySnapshotSelfTest`
  - `runMemoryCenterGroupSessionMemorySnapshotSelfTest`
  - `npm run build:mcp-feishu`
  - `npm run build:frontend`
  - `npm run test:chat-experience`
