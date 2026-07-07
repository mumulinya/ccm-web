# Phase 59 - Read Plan Revalidation Session Binding

日期：2026-07-07

## 目标

把 Phase 58 的 compact file reference read plan revalidation gate 绑定到具体第三方子 Agent 会话，避免群聊主 Agent 把“另一个会话/旧会话的回执”误当成本轮子 Agent 已经重读当前源。

这一步继续向 Claude Code 风格记忆系统靠拢：压缩记忆不只是被下发，还必须能证明哪个会话收到、哪个会话使用、哪个会话完成了当前源重读。

## 本阶段完成

- 子 Agent 记忆包中的 read plan revalidation gate 会携带 `session_binding`，包含 `task_agent_session_id`、`native_session_id`、`task_id`、`trace_id`、`execution_id`、`agent_type` 和 turn。
- 子 Agent 回执评分新增 `read_plan_revalidation_gate` 硬门禁：
  - 必须引用 `revalidation_gate_id`。
  - 必须引用 stale `read_plan_id`。
  - 必须声明 `current source verified` / re-read，或在 `memoryIgnored` 说明不使用。
  - 若 gate 带 session binding，回执必须来自绑定的 task Agent session。
- `buildDeliverySummary` 会收集 `read_plan_revalidation_gates`，生成：
  - `read_plan_revalidation_gate_receipt_rows`
  - `read_plan_revalidation_gate_receipt_passed`
  - `read_plan_revalidation_gate_summary`
- 主 Agent 验收、运行态快照、协作事件流、精准返工建议和结果复检都接入 read plan revalidation session binding。
- Worker handoff 的回执模板新增 `readPlanRevalidationUsage` 示例，并要求存在 revalidation gate 时写明 gate、read plan、current source verified 和 session id。
- Memory Center 后端扩展：
  - revalidation report 记录 expected/receipt session。
  - 错会话回执不再算通过。
  - 新增质量检查码 `compact_file_reference_read_plan_revalidation_session_binding`。
  - group 详情暴露 `compactFileReferenceReadPlanRevalidationSessionBinding`。
  - overview 告警会显示 read plan revalidation session mismatch。
- Memory Center 前端 Read Plan Revalidation 面板显示 session bound/mismatch 计数，并在 row/gap 中展示 expected / receipt session。

## 行为规则

1. 如果历史 compact read plan 的源文件变化，下一次子 Agent bundle 必须带 revalidation gate。
2. 子 Agent 结果说明必须在同一绑定会话中声明重读当前源。
3. 只提到 gate/read_plan_id，但没有 current source verified 或 memoryIgnored 原因，不通过。
4. 另一个子 Agent 会话或旧 native session 的回执即使内容正确，也不通过。
5. Memory Center 会把错会话回执标为 session mismatch，并给出 expected / receipt session 证据。

## 主要文件

- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/agents/worker-handoff.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `runReadPlanRevalidationGateReceiptValidationSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest`
- `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
- `runMemoryDispatchGateReceiptValidationSelfTest`
- `runPostCompactReinjectionGateReceiptValidationSelfTest`
- `npm run build:frontend`
- `npm run build:mcp-feishu`

## 后续方向

- 把 read plan revalidation session binding 的同类机制推广到更多 memory gate，例如 typed MEMORY.md 索引召回和 partial compact repair ledger。
- 继续补齐第三方 Agent 原生 session resume / replay 的自动核验，让 Claude Code、Cursor、Codex 子会话的记忆使用证据更接近 Claude Code 内建连续会话体验。
- 将 Memory Center 的 session mismatch 告警接入群聊主 Agent 自动精准返工，使错会话回执能自动触发同一 session 的续跑。
