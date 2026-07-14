# Main Agent Live Checkpoints V1

日期：2026-07-07

## 背景

上一轮已经让任务卡能展示 `progress_checkpoints`。本轮继续参考 `D:\claude-code` 的 `SendUserMessage` 思路：长任务不应该只在最终卡片里出现结果，也应该在阶段边界给用户一个可读的进展提示。进展提示必须有信息量，技术 trace、session、回执协议仍放在技术详情。

## 改动

- `/api/groups/messages` 现在返回 `mainAgentStatus`。
- `mainAgentStatus` 会从群聊任务、runtime task card、Agent QA 中提取：
  - 当前阶段
  - 执行中的子 Agent
  - 开放问答数量
  - 最近关键进展 `latest_progress_checkpoint`
  - 最新交付摘要和折叠技术信息
- 群聊任务创建 SSE 现在携带 `ccm-main-agent-live-checkpoint-v1`。
- `GroupChat.vue` 会在收到 `status` / `task_created` SSE 时即时更新状态卡。
- `GroupMainAgentStatusCard.vue` 新增“最近进展”区块，展示用户能看懂的 checkpoint。
- 全局 Agent 的流式事件 `ui` 现在统一附带 `ccm-main-agent-live-checkpoint-v1`。
- `GlobalAgent.vue` 会保存流式过程中的 `progressCheckpoints`，让全局主 Agent 的实时进展和最终任务卡进展字段保持一致。
- Playwright 渲染 fixture 增加主 Agent 状态卡，并断言“最近进展”真实渲染。

## 用户体验

- 用户在群聊里创建任务后，状态卡会立即显示类似“主 Agent 已生成执行前计划”“已派发给子 Agent”的最近进展。
- 后端权威状态会在 `/api/groups/messages` 轮询时继续同步，避免只靠前端临时状态。
- 全局主 Agent 的流式消息仍保持友好短句，并额外保留结构化 live checkpoint。
- 普通问话仍不会展示 Todo/任务卡。
- 技术详情仍默认折叠。

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:chat-experience`
- `npm run test:replay-regression`
- `npm run test:code-changes`
- `runCollaborationUxSelfTest`
- `runGlobalAgentLoopSelfTest`
- `runMainAgentWorkchainSelfTest`

渲染截图：

- `scratch/render-regression/03-technical-details-folded.png`

该截图现在同时覆盖主 Agent 状态卡“最近进展”、任务卡“关键进展”和折叠技术详情。

## 后续

下一步可以把更多后端阶段事件映射成 live checkpoint，例如子 Agent 回执、验收门禁、返工、恢复接续、全局监工完成通知。当前版本先打通主状态卡和全局流式消息的统一结构。
