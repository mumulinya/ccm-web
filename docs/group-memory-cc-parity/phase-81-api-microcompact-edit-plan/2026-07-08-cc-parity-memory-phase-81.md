# Phase 81 - API Microcompact Edit Plan

## 目标

对照 `D:\claude-code\src\services\compact\apiMicrocompact.ts`，为 CCM 群聊记忆增加 API microcompact edit plan。Claude Code 可在 API context management 中下发 `clear_thinking_20251015` 与 `clear_tool_uses_20250919`，用来降低超大上下文压力。CCM 的场景不同：项目子 Agent 多数是第三方 CLI 会话（Claude Code / Cursor / Codex 等），所以本阶段实现为“可审计计划层”，支持 native context-management 的执行器可应用，不支持的第三方 CLI 只把它当作上下文压力与清理边界提示。

## 已完成

- 新增 `ccm-api-microcompact-edit-plan-v1`。
- 对齐 Claude Code 默认阈值：
  - `maxInputTokens = 180000`
  - `targetInputTokens = 40000`
  - `clearAtLeastTokens = max - target`
- 识别群聊消息中的：
  - thinking block
  - redacted thinking block
  - tool_use block
  - tool_result block
- 生成 context-management edit plan：
  - `clear_thinking_20251015`
  - `clear_tool_uses_20250919`
  - 清理 tool result 输入：`Bash`、`Shell`、`PowerShell`、`Glob`、`Grep`、`Read`、`FileRead`、`WebFetch`、`WebSearch`
  - 保留 edit/write 类工具边界，避免把修改证据当成可随意清理的上下文。
- `compactGroupConversationMemory()` 在以下路径写入计划：
  - 正常主压缩路径
  - 低压力 skip 路径
  - partial sidecar only 路径
- 压缩边界写入：
  - `boundary.apiMicroCompactEditPlan`
  - `boundary.post_compact_restore.apiMicroCompactEditPlan`
  - `memory.compaction.apiMicroCompactEditPlan`
  - `memory.messageCompression.apiMicroCompactEditPlan`
- `refreshGroupConversationMemorySnapshot()` 在 recent-window-only 与 sync compact 路径写入计划。
- `buildGroupPostCompactCleanupAudit()` 记录 `apiMicroCompactEditPlanId`，把 API context-management 计划纳入压缩后 cleanup 审计。
- 子 Agent 记忆包 `renderGroupMemoryContextBundle()` 渲染：
  - edit count
  - advisory/native apply 边界
  - active tokens / trigger
  - thinking/tool_use/tool_result 信号计数
  - 不支持 native API context management 时不得删除 CCM 群聊原文或 typed MEMORY.md。
- Memory Center 新增：
  - `api_microcompact_edit_plan` 质量项
  - `buildApiMicroCompactEditPlanReport`
  - `evaluateApiMicroCompactEditPlan`
  - `runMemoryCenterApiMicroCompactEditPlanSelfTest`
  - 群聊详情 `postCompactUsage.apiMicroCompactEditPlan`
  - 总览告警
  - 前端 `API Microcompact Edit Plan` 面板
- 旧压缩边界支持 legacy inferred overview，避免 Phase 81 前的历史数据被误判为治理失败。

## 边界

- CCM 不直接修改第三方 CLI 的内部上下文缓存。
- 对 Claude Code API 或未来支持 native context-management 的执行器，计划可作为可应用的 edit config。
- 对 Claude Code CLI / Cursor / Codex 等新会话型子 Agent，计划只作为 advisory metadata，用于告诉子 Agent 当前群聊上下文压力、哪些 thinking/tool result 可在执行器侧清理、哪些 CCM 原始记忆不能清理。
- 群聊 raw messages、typed MEMORY.md、Global Agent memory 与 Memory Center ledger 都不是 API microcompact 的删除对象。

## 验证

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runGroupApiMicroCompactEditPlanSelfTest`
- `runMemoryCenterApiMicroCompactEditPlanSelfTest`
- `buildMemoryQualityReport({ checkIds: ['api_microcompact_edit_plan'], refresh: true })`
- `npm run check`
- `npm run build`

## 结果

Phase 81 已完成。CCM 现在能为每个群聊压缩边界生成 Claude Code `apiMicrocompact.ts` 风格的 API context-management edit plan，并把它存入压缩记忆、传给子 Agent 上下文、纳入 post-compact cleanup audit、交给 Memory Center 质量检查和前端治理面板。

## 下一步候选

- 为支持 native context-management 的执行器增加实际 apply adapter，把 `contextManagement.edits` 映射到对应 API 请求。
- 增加 API microcompact edit plan 的 receipt 要求，要求子 Agent 声明本轮是否使用了 native apply 或仅按 advisory 处理。
- 增加历史群聊 backfill，将 legacy inferred 计划写回旧 compact boundary，减少只读推断状态。
