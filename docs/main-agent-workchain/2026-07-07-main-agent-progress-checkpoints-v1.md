# Main Agent Progress Checkpoints V1

日期：2026-07-07

## 背景

参考 `D:\claude-code` 中 `SendUserMessage` 的设计，用户真正需要看到的是有信息量的阶段检查点：已接收、已计划、已派发、已验收、已总结。原始工具事件、Trace、session、回执协议仍应留在技术详情里，默认折叠。

本次升级补齐群聊主 Agent 和全局主 Agent 共用的“关键进展”展示协议，让任务卡不只显示 Todo 和阶段条，也能说明为什么任务推进到了当前状态。

## 改动

- 在 `backend/agents/workchain.ts` 增加 `ccm-main-agent-progress-checkpoints-v1`。
- 从真实 `workflow_timeline`、Todo 步骤、动作和阶段中生成用户可读 checkpoint。
- 有真实时间线时优先保留时间线，只在不足时用 Todo/阶段补位，避免关键协作事件被普通步骤挤掉。
- 在群聊任务卡构建时把 `task.workflow_timeline` 传入统一 display stream。
- 在全局主 Agent 的 display stream 中同步输出 `progress_checkpoints`。
- 在 `TaskExperienceCard.vue` 新增“关键进展”区块，技术详情仍保持折叠。
- 在全局任务卡/全局 run 任务卡转换工具中透传 checkpoint。
- 在 Playwright 渲染回归里补充“关键进展”真实 DOM 断言。

## 用户体验

- 普通问话仍不会展示 Todo 或任务卡。
- 执行型任务会显示“关键进展”，例如“主 Agent 已制定协作计划”“已派发给子 Agent”“已检查交付质量”。
- Trace、session、原始回执、执行器细节仍在“技术详情”里默认折叠。
- 群聊主 Agent 与全局主 Agent 使用同一套展示字段，后续可以继续扩展而不用分两套 UI。

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `node -e "const m=require('./ccm-package/dist/agents/workchain.js'); const r=m.runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"`
- `node -e "const m=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass},null,2)); if(!r.pass) process.exit(1);"`
- `node -e "const m=require('./ccm-package/dist/agents/global/loop.js'); Promise.resolve(m.runGlobalAgentLoopSelfTest()).then(r=>{console.log(JSON.stringify({pass:r.pass,completedRunsHaveProgressCheckpoints:r.completedRunsHaveProgressCheckpoints,ordinaryAnswerDoesNotShowDeliveryReport:r.ordinaryAnswerDoesNotShowDeliveryReport},null,2)); if(!r.pass) process.exit(1);}).catch(e=>{console.error(e); process.exit(1);});"`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `npm run test:code-changes`

渲染截图输出：

- `scratch/render-regression/01-simple-conversation-no-todo.png`
- `scratch/render-regression/02-task-plan-visible.png`
- `scratch/render-regression/03-technical-details-folded.png`
- `scratch/render-regression/04-child-agent-summary-expanded.png`

## 后续

下一步可以继续把长任务的 checkpoint 与 SSE 实时状态结合起来，让正在执行中的任务在阶段边界实时刷新，而不是只在卡片重建时体现。
