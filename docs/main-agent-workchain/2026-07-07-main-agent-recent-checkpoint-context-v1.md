# Main Agent Recent Checkpoint Context V1

日期：2026-07-07

## 背景

上一轮已经让群聊主 Agent 状态卡能展示 live checkpoint。本轮继续参考 `D:\claude-code` 的近期活动展示思路：用户更关心“现在最新发生了什么”，同时需要看到前面一两步上下文来判断任务是不是在稳步推进。

之前状态卡可能优先显示较早的 active checkpoint，例如“已派发给子 Agent”，即使后面已经出现了“已检查交付质量”这类更接近当前阶段的事件。这样用户会误以为任务仍停留在派发阶段。

## 改动

- `buildGroupMainAgentStatus()` 现在会从任务卡 checkpoint 中提取非 pending 的有效进展。
- `latest_progress_checkpoint` 改为按时间线顺序选择最后一个有效 checkpoint。
- 新增 `recent_progress_checkpoints`，保留最近 3 个有效 checkpoint 作为上下文。
- `GroupMainAgentStatusCard.vue` 会在“最近进展”下方展示最多 2 个近期上下文标签。
- `GroupChat.vue` 在接收 SSE checkpoint 时同步维护 `recent_progress_checkpoints`，让实时状态和接口回读状态保持一致。
- Playwright 渲染 fixture 改为断言最新进展是“已检查交付质量”，并确认近期上下文仍能看到“已派发给子 Agent”。
- 静态自测增加 `recent_progress_checkpoints` 和 `recent-checkpoint-list` 保护，避免后续重构时丢掉这条用户可见链路。

## 用户体验

- 用户打开群聊时，会看到最贴近当前阶段的进展，而不是卡在旧的派发提示。
- 状态卡仍保持友好短句，只显示主 Agent 的工作进展，不暴露 trace、session、协议回执等技术内容。
- 前面发生过的关键动作会以小标签保留上下文，用户能快速判断任务已经经历了计划、派发、验收等阶段。
- 普通问话仍不会展示 Todo 或任务卡。
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

渲染截图输出：

- `scratch/render-regression/01-simple-conversation-no-todo.png`
- `scratch/render-regression/02-task-plan-visible.png`
- `scratch/render-regression/03-technical-details-folded.png`
- `scratch/render-regression/04-child-agent-summary-expanded.png`

## 后续

下一步可以继续增强“最终总结”链路：当群聊主 Agent 或全局主 Agent 确认任务完成后，把用户可读总结、验收证据、未完成事项和技术详情统一整理成一张完成卡，避免用户需要从多条消息里拼结果。
