# 2026-07-07 Claimable Work Items V1

## 背景

本轮目标：参考 `D:\claude-code` 的 Tasks V2 / Swarm 任务协作机制，把本项目主 Agent 派发给第三方写代码 Agent 的工作从“临时展示”升级为“稳定工作项账本”。

重点参考：

- `D:\claude-code\docs\tools\task-management.mdx`：任务实体包含 `owner/status/blocks/blockedBy`，支持认领、依赖、完成后继续找下一项。
- `D:\claude-code\docs\agent\coordinator-and-swarm.mdx`：主 Agent 先理解再分配，子 Agent 完成后通过通知/回执交回结果。
- `D:\claude-code\src\tools\AgentTool\UI.tsx`：用户只看到压缩后的执行摘要，详细 transcript 可展开。

## 本轮实现

新增 `backend/agents/work-items.ts`：

- 定义主 Agent 工作项：`subject/owner/target/status/blocks/blockedBy/attempt/evidence/filesChanged/verification/blockers`。
- 支持从已有 `delivery_summary.assignment_evidence`、`receipt_statuses`、`receipts`、`mission_plan.targets` 和任务目标自动生成工作项。
- 支持 CC 风格认领：未完成依赖不可认领、已被其他 Agent 执行中的工作不可重复认领、同一 owner 可开启忙碌保护。
- 支持子 Agent 超时重派：`requeueStaleMainAgentWorkItems()` 会释放 owner、增加 attempt，并保留重派原因。
- 支持自测：`runMainAgentWorkItemSelfTest()` 覆盖依赖、认领、忙碌保护、回执完成和重派。

接入群聊/全局任务链路：

- `createTask()` 创建任务时初始化 `work_items`。
- `updateTask()` 在回执、交付摘要、执行记录变化后同步 `work_items`。
- `buildTaskCardView()` 输出 `work_items/work_item_summary`，并把工作项合入用户可见 agent 进度。
- `buildTaskEntityChain()` 增加 `work_items`，让技术详情能追溯任务、派发、执行、回执和工作项的关系。
- 全局任务卡会从 mission children 推导执行队列，用户能看到跨项目目标的完成情况。

前端：

- `TaskExperienceCard.vue` 增加“执行队列”区域，展示子 Agent 工作项、状态、owner、依赖和最新证据。
- `taskExperience.js` 为全局任务卡补齐 `work_items/work_item_summary`。
- 截图回归 fixture 增加工作项样例，确保真实渲染覆盖。

## 用户体验约定

- 用户看到的是“执行队列、谁在做、是否完成、是否等待前置工作”。
- 认领、attempt、work item id、技术追踪仍放在技术详情或内部数据里。
- 普通问话不会创建工作项，也不会显示 Todo/执行队列。

## 验证

已通过：

```powershell
npm run check
npm run build
node -e "const m=require('./ccm-package/dist/agents/work-items.js'); const r=m.runMainAgentWorkItemSelfTest(); console.log(JSON.stringify(r.checks,null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, workItemsVisible:r.checks.workItemsVisible, workItemSelfTestPasses:r.checks.workItemSelfTestPasses},null,2)); if(!r.pass) process.exit(1)"
node scripts/main-agent-decision-ui-selftest.mjs
npm run test:render-regression
npm run test:chat-experience
npm run test:replay-regression
npm run test:code-changes
```

截图回归产物：

- `scratch/render-regression/03-technical-details-folded.png`
- `scratch/replay-regression/02-replay-task-visible-todo.png`
