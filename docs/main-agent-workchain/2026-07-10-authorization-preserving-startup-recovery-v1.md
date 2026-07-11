# 主 Agent 授权保留式启动恢复 v1

日期：2026-07-10

## 本轮目标

参考 Claude Code Tasks V2 的持久任务和异常恢复思路，补齐群聊主 Agent 在服务中断、重启后的继续执行链路：

- 已经得到用户确认并真实入队或开始执行的任务，重启后自动接上。
- 执行前计划仍待确认、用户主动暂停、人工接管、运行债务、账号/凭据/工具授权缺失的任务，不自动恢复。
- 恢复前重新核对原始目标、当前状态、验收条件和剩余缺口。
- 用户区只展示“已自动接上”或“仍等待确认”；策略代码、租约和判定证据放在默认折叠的技术详情。

## 实现

### 风险分层恢复策略

新增 `backend/modules/collaboration/startup-task-recovery.ts`：

- `buildStartupTaskRecoveryDecision(task, forceAuto)`
- `buildStartupTaskRecoveryPlan(tasks, forceAuto)`
- `runStartupTaskRecoveryDecisionSelfTest()`

恢复结果分为：

- `auto`：授权已保留，可以自动接上。
- `manual`：仍需要用户确认或处理，保持暂停。
- `skip`：已结束、归档或不属于自动任务，不参与恢复。

自动恢复必须至少有一项持久化授权证据：

- 执行前计划已经确认。
- 任务已经进入队列。
- 任务已经开始执行。
- 执行租约已经获取。
- 运维或用户从“恢复自动任务”入口显式恢复。

### 队列恢复

`resumeTaskQueues` 现在可以在同一批任务中同时处理：

- 安全任务自动恢复。
- 高风险或待确认任务保持原状态。
- 返回 `auto_resumed`、`manual_pending`、`skipped` 分项结果。

自动恢复会持久化：

- 原状态和恢复时间。
- 是否保留用户授权。
- 恢复判定原因和授权证据。
- 目标、状态、验收条件复核记录。
- 用户可读恢复标题和下一步。

### 用户展示

共享任务卡的恢复区支持后端提供 `status_label`：

- 自动恢复：`已自动接上`
- 需要用户：`待确认`
- 已结束记录：`已记录`

用户可以看到：

- 原任务已接上。
- 目标、状态、验收是否重新核对。
- 已保留原执行授权、会话和工作项。
- 仍待补齐的验收缺口。
- 当前 Todo 和下一步。

用户默认看不到：

- `reason_code`
- `queued_at`、`started_at`
- 租约、Trace、恢复策略内部字段

任务管理页的手动恢复提示也改为分别报告“已自动接上、仍等待确认、已跳过”。

## 验证

已通过：

- `runStartupTaskRecoveryDecisionSelfTest()`
  - 已开始且已授权任务自动恢复。
  - 已确认并入队的 pending 任务自动恢复。
  - 待确认计划不自动恢复。
  - 用户暂停、人工恢复等待、运行债务、授权缺失不自动恢复。
  - 显式恢复可以释放仅由上次启动恢复产生的人工等待。
  - 混合批次正确分成 auto / manual / skip。
- `runCollaborationUxSelfTest()`
  - 后端任务卡显示“已自动接上”。
  - 显示保留用户授权、目标/状态/验收复核和恢复 Todo。
- `runCollaborationProtocolSelfTest()`
- `node scripts/main-agent-decision-ui-selftest.mjs`
  - 计划缺验收提醒、计划确认后执行跟进、执行队列验收提醒均有静态保护。
  - 任务管理页分别展示 `已自动接上`、`仍等待确认`、`已跳过`。
- `npm run build:frontend`
- `npm run test:chat-experience`
- `npm run test:render-regression`
  - 24 张真实浏览器截图。
  - 新增 `scratch/render-regression/02f-startup-auto-recovery.png`。
  - 普通问话仍不显示 Todo。
  - 自动恢复任务显示 Todo 和“进行中”，不会再次显示“需确认”。
  - 技术详情默认折叠，内部判定字段不可见。
- `npm run test:replay-regression`
  - 4 张回放截图。

## 当前并行状态

本阶段实现期间，`npx tsc -p backend/tsconfig.json --noEmit --declaration false` 曾通过。最终审计再次执行时，被另一 Agent 正在开发的 TestAgent 多会话比较类型挡住，4 个错误均位于：

- `backend/test-agent/browser/multi-session-summary.ts`
- `backend/test-agent/execution-plan.ts`

本轮未越界修改 TestAgent 业务。协作模块和新增恢复模块已经发射到 `ccm-package/dist`，恢复决策自测、协作 UX 自测、协作协议自测、前端构建、聊天体验、24 张真实渲染截图和 4 张回放截图均通过。
