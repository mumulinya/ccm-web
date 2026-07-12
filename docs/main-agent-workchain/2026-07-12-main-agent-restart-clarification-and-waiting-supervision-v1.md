# 主 Agent 重启后的澄清接续与等待监督稳定性 v1

## 目标

保证服务或页面刷新后，主 Agent 仍能准确接回原请求，同时不会在等待用户补充时反复推进同一任务或制造重复阻塞记录。

## 本次升级

- 全局主 Agent 的待澄清输入显式携带 `clarification_run_id`。
- 服务端只允许同一会话中仍处于 `waiting_clarification` 的指定运行继续，避免串接其他请求。
- 页面刷新后，若最新一条主 Agent 回复仍在等待澄清，输入框恢复为“提交补充”模式。
- 历史中的旧澄清不会覆盖最新回复，也不会劫持已经开始的新对话。
- 全局任务监督器重启后保留 `waiting_user`，但定时调度只推进 `monitoring` 状态。
- 同一任务、同一原因的重复等待事件会合并，并记录最近观察时间与出现次数。

## 用户可见行为

- 用户回答澄清后继续的是原运行、原 Trace、原计划和原验收上下文。
- 等待用户时界面继续显示等待状态，不会出现周期性重复提示。
- 用户补充条件后，监督器恢复为执行跟进状态并继续验收。
- 技术标识仍只保留在技术详情和内部请求中。

## 验证

- 后端与集成 TypeScript `--noEmit` 通过。
- 前端生产构建通过。
- 后端生产构建通过。
- 全局任务监督器异步自测通过，包括等待恢复、调度边界、重复事件合并和补充后继续。
- 主 Agent 决策 UI 源码自测通过。
- 统一聊天任务体验自测通过。

## 关键文件

- `backend/modules/global/global-agent.ts`
- `backend/agents/global/mission-supervisor.ts`
- `frontend/src/components/global/GlobalAgent.vue`
- `scripts/main-agent-decision-ui-selftest.mjs`
