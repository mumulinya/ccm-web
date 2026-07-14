# 群聊主 Agent 澄清摘要 v1

## 背景

参考 `D:\claude-code` 的 `AskUserQuestion` 链路，主 Agent 在信息不足时不应该只输出一段普通文本。用户需要明确看到：主 Agent 为什么暂停、具体等自己回答什么、回答后会如何继续。

## 本次升级

- 新增 `buildGroupClarificationSummary`，当群聊主 Agent 的派发策略为 `ask_user` 时生成结构化澄清摘要。
- 群聊 SSE 和历史消息都会携带 `clarification_summary`，刷新页面后仍能看到同一张卡。
- `AgentExecutionMessage` 新增轻量澄清卡，展示问题、原因、建议回答方式和下一步。
- 该卡明确 `show_todo: false`，普通澄清不会创建 Todo 或任务卡。

## 用户体验约束

- 普通问话仍然是普通回复，不显示 Todo。
- 需要补信息时，用户看到的是“等待你回复”的轻量卡，而不是内部 dispatch policy。
- `trace_id`、`session_id`、`task-notification`、raw payload 等内部协议词不会出现在澄清卡用户可见文本里。

## 验证

- `runGroupClarificationSummarySelfTest()` 覆盖 schema、等待用户状态、问题可见、建议可见、Todo 隐藏和协议词隐藏。
- `scripts/main-agent-decision-ui-selftest.mjs` 覆盖后端 schema、SSE 字段透传和前端渲染结构。
