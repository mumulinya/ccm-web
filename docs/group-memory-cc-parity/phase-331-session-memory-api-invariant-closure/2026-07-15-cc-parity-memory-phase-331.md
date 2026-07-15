# CCM Memory CC Parity Phase 331

## 目标

对齐 Claude Code `adjustIndexToPreserveAPIInvariants()`：Session Memory 压缩确定初始保留窗口后，必须先向前闭合 provider API 消息事务，不能把孤立 `tool_result`、thinking 分片或群聊任务事务交给群聊主 Agent 和第三方项目子 Agent。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
- `adjustIndexToPreserveAPIInvariants()`
- `calculateMessagesToKeepIndex()`

Claude Code 会：

1. 收集整个保留区的所有 `tool_result.tool_use_id`。
2. 向前寻找缺失的 `tool_use`，而不是只检查切点附近一条消息。
3. 收集保留区 assistant message 的 provider `message.id`。
4. 向前保留具有相同 provider `message.id` 的 thinking/tool_use 流式分片。
5. 在上一 compact boundary 处停止向前扩展。

## 实现

新增：

- `ccm-group-session-memory-api-invariant-closure-v1`
- `adjustGroupSessionMemoryKeepIndexToPreserveApiInvariants()`
- `verifyGroupSessionMemoryApiInvariantClosure()`

闭包覆盖 CCM 和第三方 provider 的多种消息形态：

- `content/message.content/blocks` 中的 `tool_use/server_tool_use`。
- `tool_result/web_search_tool_result`。
- OpenAI-compatible 风格 `tool_calls/tool_results`。
- `message.id/providerMessageId/provider_message_id` 流式分片。
- CCM `task_id/taskId/receipt/delivery_summary` 任务事务。

算法从 Session Memory 游标计算出的初始 `keepIndex` 开始，反复向前扩展，直到工具依赖、provider message 分片和任务事务都达到固定点。receipt 只保存 ID、索引、数量和 checksum，不保存 thinking、tool input、tool result 正文。

如果上一压缩边界阻止闭包，仍存在缺失 tool use、分裂 provider message 或任务事务，Session Memory 快路径以 `api_invariant_closure_unresolved` 回退传统压缩，不能带着 invariant failure 继续。

## 选择、恢复与上下文

Phase 330 的 `ccm-group-session-memory-compact-selection-v1` 新增 `api_invariant_closure`：

- 原始/调整后 keep index。
- 向前扩展消息数。
- 纳入的 tool use/provider message/task ID。
- 未解析 tool use、分裂 provider message 和任务事务状态。
- `pass`、`body_free`、`receipt_checksum`。

selection verifier 对 selected 路径强制要求 closure receipt 有效。selection checksum 已由 boundary journal identity 持久绑定，因此 closure 被篡改后 resume fail closed。

项目子 Agent 上下文显示 `API invariant closure=pass(+N)`。Memory Center 的 Session Memory 状态显示向前扩展消息数；Global Agent 的 global-only 上下文边界不变。

同时修正 `buildGroupCompactWindowInvariants()` 的 provider message 识别，使它能发现“compacted thinking + kept tool_use”这种共享 provider message ID 的分裂，而不再只比较 CCM 顶层消息 ID。

## 验证

新增：

- `scripts/group-session-memory-api-invariant-closure-restart-selftest.mjs`
- `npm run test:group-session-memory-api-invariant-closure-restart`

专项结果：`14/14`。

覆盖：

- 保留区任意位置 tool result 的 tool use 闭包。
- 同 provider message ID thinking/tool-use 分片闭包。
- 无 task ID 时 provider 分片仍可独立闭包。
- 群聊 task transaction 闭包。
- 显式 `tool_calls/tool_results` 兼容。
- strategy decision 三类 invariant 全部通过。
- Session Memory 复用仍为 compaction API 零调用。
- 原始 transcript 不修改。
- boundary journal 重启恢复。
- closure checksum 篡改拒绝。
- 上一边界无法闭包时 fail-closed 回退。

回归：

- Phase 330 session-memory-first selection：`15/15`。
- boundary journal：`16/16`。
- `npm run check`：通过。
- `npm run build`：通过。

## 当前判断

Phase 331 关闭了 Session Memory 快路径中一个会直接导致第三方 Agent provider API 报错或丢失 thinking 上下文的缺口。压缩窗口现在不仅满足 token 容量，还必须是 provider API 可执行的完整事务窗口。

长期目标继续保持 active，下一轮继续对照 Claude Code 的 compact 后状态重置、cache baseline 和 Session Memory 游标生命周期。
