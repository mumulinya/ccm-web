# 全局历史消息可见文本清理 v1

## 背景

全局主 Agent 已经补齐了实时 SSE 文本清理和完成总结路径清理，但全局页仍有刷新后的历史展示入口：

- 本地会话历史会重新渲染 `msg.content`。
- 服务器同步回来的全局消息也会走普通 bubble。
- 消息导航摘要默认读取 assistant 的 `content` 或 `agenticRun.final_reply`。

如果旧历史里保存过 `CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、`WorkerContextPacket` 或 raw payload，刷新页面后仍可能重新出现在正文或消息导航里。

## 本次升级

- `GlobalAgent.vue` 新增 `getVisibleGlobalMessageContent`：
  - 用户消息保持原文。
  - assistant / system / 全局 Agent 消息统一走可见文本清理。
  - 有 `agenticRun` 时优先使用结构化交付报告，再回退到清理后的 `final_reply` / `content`。
- 全局普通 bubble 改为展示 `getVisibleGlobalMessageContent(msg)`。
- Git review Markdown 渲染改为使用清理后的文本。
- `useMessageNavigation` 在全局页接入 `getAssistantContent`，导航摘要也不直接读取原始 assistant 内容。

## 用户体验

全局主 Agent 历史会话刷新后，用户仍然看到：

- 普通问答正文。
- 任务计划和执行进展。
- 结构化交付总结。
- 必要的下一步提示。

内部协议、Trace、session、原始 payload 仍默认留在技术详情或结构化数据中，不进入用户正文和导航摘要。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `globalAgentHistoryMessagesSanitizeVisibleContent`，检查：

- 全局页存在 `getVisibleGlobalMessageContent`。
- 全局消息导航使用清理后的 assistant 内容。
- Git review 和普通 bubble 使用清理后的显示文本。
- `useMessageNavigation` 支持 `getAssistantContent` / `getUserContent`。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过，包含 `globalAgentHistoryMessagesSanitizeVisibleContent`。
- `git diff --check -- frontend/src/components/global/GlobalAgent.vue frontend/src/composables/useMessageNavigation.js frontend/src/components/knowledge/MemoryCenter.vue scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/2026-07-07-global-history-visible-message-sanitizer-v1.md`：通过，仅提示 Windows 换行转换。
- `npm run check`：通过。
- `npm --prefix frontend run build`：通过。
- `npm run test:chat-experience`：通过，确认普通问话保持直接回复，任务链路才展示任务卡/计划。
- `npm run test:render-regression`：通过，生成真实渲染截图：
  - `scratch/render-regression/01-simple-conversation-no-todo.png`
  - `scratch/render-regression/02-task-plan-visible.png`
  - `scratch/render-regression/03-technical-details-folded.png`
  - `scratch/render-regression/04-global-stream-dispatch-panel.png`
  - `scratch/render-regression/05-code-change-drawer-open.png`
  - `scratch/render-regression/06-child-agent-summary-expanded.png`
- `npm run build`：通过，前端、飞书 MCP 集成、后端均完成构建。
