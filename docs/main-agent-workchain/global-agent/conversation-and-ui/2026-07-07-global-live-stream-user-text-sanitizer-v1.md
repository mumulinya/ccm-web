# 全局主 Agent 实时流用户可见文本消毒 v1

## 背景

`D:\claude-code` 的 coordinator 模式把 worker 通知视为内部信号：主 Agent 要理解这些结果，再用用户能看懂的话总结；`<task-notification>`、trace、session、原始 payload 等不应该直接出现在用户正文里。

本项目全局主 Agent 后端已经有派发摘要、状态追问和直派结果的可见文本清理，但前端 `GlobalAgent.vue` 的 SSE 实时流仍有三处风险：

- `text` 事件直接拼接 `data.text`。
- `result` 事件直接展示 `run.final_reply`。
- `error` 事件直接展示 `data.text`。

如果第三方写代码 Agent 或后端执行器返回了 `CCM_AGENT_RECEIPT`、`trace_id`、`WorkerContextPacket` 等内部内容，就可能混进全局主 Agent 的用户消息正文。

## 本次升级

- `GlobalAgent.vue` 新增 `GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN`，识别：
  - `CCM_AGENT_RECEIPT`
  - `<task-notification>`
  - `receipt-status`
  - `trace_id` / `session_id`
  - `WorkerContextPacket`
  - `raw receipt` / `raw payload`
  - `Runtime Kernel`
  - `native_session` / `task_agent_session`
- 新增 `sanitizeGlobalVisibleStreamText`：
  - 普通文本保留原来的段落和 Markdown 结构。
  - 旧术语“回执”等会改成“结果说明”。
  - 检测到内部协议词时，用户可见区显示友好的处理状态。
- `text` 流式事件新增 raw buffer：
  - 即使内部协议词被拆成多个 SSE chunk，也能在拼接后识别。
  - 一旦识别为内部内容，就不再把原始技术文本继续拼到正文。
- `result` 和 `error` 事件也统一走用户可见清理。
- 等待确认提示里的工具名也会被清理，避免工具名或协议词泄露到正文。

## 用户体验

用户现在会看到：

```text
全局主 Agent 已收到技术执行信息，正在整理用户可读结论。
```

而不是：

```text
CCM_AGENT_RECEIPT ...
trace_id=...
WorkerContextPacket ...
```

这让全局主 Agent 和群聊主 Agent 的展示策略保持一致：用户看到计划、进展、验收、总结；技术细节默认进入技术详情。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `globalAgentLiveStreamsSanitizeInternalProtocol`，检查：

- 全局实时流存在内部协议词识别。
- `sanitizeGlobalVisibleStreamText` 已接入。
- SSE text 使用 raw buffer。
- 不再直接 `agentMsg.content += data.text`。
- 友好 fallback 文案存在。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `git diff --check -- frontend/src/components/global/GlobalAgent.vue scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/global-agent/conversation-and-ui/2026-07-07-global-live-stream-user-text-sanitizer-v1.md`
- `npm run check`
- `npm --prefix frontend run build`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run build`

以上验证均通过；空白检查只出现仓库既有的 CRLF 提示。
