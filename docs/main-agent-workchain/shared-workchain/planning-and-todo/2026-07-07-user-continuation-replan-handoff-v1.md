# 用户补充需求接续与目标重核 v1

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 的协调器链路，用户在任务执行中补充要求或改变目标时，主 Agent 不能只把内容塞回任务里静默继续。它需要向用户说明：

- 这条信息是补充要求、目标调整，还是应该拆成独立新任务。
- 当前执行轮是否会被等待，还是可以马上继续。
- 是否需要重新核对计划、影响范围和验收条件。
- 已有文件、验证和子 Agent 结果说明会继续作为上下文，不会丢失。

## 改动

- 后端新增 `buildContinuationUserDecision`，统一生成用户可读的接续策略、处理方式、重核计划标记和三步 handoff。
- `continueTaskWithMessage` 会把 `strategy`、`route_label`、`replan_required`、`user_visible` 写入任务续写状态。
- 目标调整 `revise_goal` 会标记 `plan_revision_required`，并在任务时间线记录 `task_goal_revision`。
- 当前任务仍在执行时收到目标调整，本轮结束后会把任务重新置入 pending，并提示主 Agent 会先重核计划再继续。
- 群聊 SSE 的 `task_updated` 文案改为友好说明，例如“主 Agent 已收到新的目标边界，会先重新核对计划，再在同一任务里继续推进”。
- 任务卡片新增接续状态展示：
  - 处理方式：本轮结束后接续、先重核计划再继续、继续派发已解锁工作项等。
  - 类型：补充要求、目标调整。
  - 三步接续：已记录、保留上下文、继续同一任务或重新核对计划。
- 技术字段仍留在结构数据和技术详情里，用户可见区不展示 `trace_id`、`session_id`、`CCM_AGENT_RECEIPT`、raw payload 等内部协议。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run test:chat-experience`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`
- `npm run test:render-regression`

截图回归覆盖：

- 普通问话不显示 Todo。
- 任务会显示 Todo 和派发摘要。
- 技术详情默认折叠。
- 子 Agent 摘要可展开。
- 下一步派发接续显示“处理方式”和“继续同一任务”。
- 目标调整接续显示“目标调整已接收”“本轮结束后接续”“重新核对计划”。
