# 群聊历史消息可见文本清理 v1

## 背景

前面已经补齐了群聊实时 SSE 文本清理和后端旧完成消息清理，但还有一个刷新后的展示入口：历史消息从后端加载后，前端组件仍会直接渲染 `msg.content`。

这意味着如果旧数据、第三方写代码 Agent、历史任务消息里已经保存了 `CCM_AGENT_RECEIPT`、`<task-notification>`、`trace_id`、`WorkerContextPacket` 或 raw payload，用户刷新页面后仍可能在群聊正文或消息导航摘要里看到内部协议。

## 本次升级

- `GroupChat.vue` 新增 `getVisibleGroupMessageContent`：
  - 用户自己发送的消息保持原文。
  - assistant / system / Agent 消息统一走 `sanitizeGroupVisibleText`。
- `ProjectTaskIntakeMessage` 新增 `displayContent`：
  - 项目任务接管气泡优先展示父组件传入的清理后文本。
- `AgentExecutionMessage` 新增 `displayContent`：
  - 普通 Agent 回复气泡优先展示清理后文本。
- `useMessageNavigation` 新增可选回调：
  - `getUserContent`
  - `getAssistantContent`
  - 群聊页给导航摘要传入同一套清理后 assistant 内容。

## 用户体验

刷新群聊历史后，用户仍然只看到：

- 主 Agent 接管说明。
- 子 Agent / 项目 Agent 的可读进展。
- 交付总结、验收状态、下一步。

不会因为旧消息持久化过原始输出，就在正文或消息导航里重新出现内部协议词。原始技术内容仍保留在结构化字段和技术详情里。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `groupHistoryMessagesSanitizeVisibleContent`，检查：

- 群聊页存在 `getVisibleGroupMessageContent`。
- 消息导航使用清理后的 assistant 内容。
- `ProjectTaskIntakeMessage` 支持 `displayContent`。
- `AgentExecutionMessage` 支持 `displayContent`。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `git diff --check -- frontend/src/components/collaboration/GroupChat.vue frontend/src/components/collaboration/ProjectTaskIntakeMessage.vue frontend/src/components/agents/AgentExecutionMessage.vue frontend/src/composables/useMessageNavigation.js scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/group-main-agent/conversation-and-ui/2026-07-07-group-history-visible-message-sanitizer-v1.md`
- `npm run check`
- `npm --prefix frontend run build`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run build`

以上验证均通过；空白检查只出现仓库既有的 CRLF 提示。
