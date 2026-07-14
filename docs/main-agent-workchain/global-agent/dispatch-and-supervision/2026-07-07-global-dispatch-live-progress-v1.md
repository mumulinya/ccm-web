# 全局主 Agent 实时派发进展 v1

日期：2026-07-07

## 背景

上一轮已经让全局主 Agent 在最终结果里携带 `dispatch_launch_summary`，用户能看到“已派发的工作”。但实际使用时，用户更早需要知道：全局主 Agent 已经把任务交给了哪些群聊主 Agent 或项目 Agent。

Claude Code coordinator 的原则是：启动 worker 后，要简短告诉用户启动了什么；worker 结果是后续独立信号，不能把启动说成完成。本次升级就是把这个原则接入全局主 Agent 的 SSE 实时进展。

## 本次升级

1. 后端实时派发事件
   - 全局 loop 在派发类工具成功后发出 `dispatch_launch_summary` 事件。
   - 覆盖 `orchestrate_development`、`send_group_cmd`、`send_project_cmd`、`create_task`。
   - 事件带同一套 `ccm-main-agent-dispatch-launch-summary-v1` 结构。

2. 用户可见进展文案
   - SSE UI 标题为“已派发的工作”。
   - 正文说明交给了哪些执行目标，以及下一步去哪里看进度。
   - 不把“已派发”写成“已完成”。

3. 前端流式消息保存摘要
   - `GlobalAgent.vue` 会把事件里的 `dispatch_launch_summary` 挂到当前流消息。
   - 如果后端已附带 `ui`，直接渲染后端友好文案；如果旧事件没有 `ui`，前端也有 fallback。

4. 协议和排障信息继续隐藏
   - `CCM_AGENT_RECEIPT`、`task-notification`、`trace_id`、`session_id`、raw payload 等不会出现在实时文案里。
   - 完整工作单、Trace、原始执行观察仍归入技术详情。

## 用户可见效果

用户发送执行需求后，流式状态会出现类似：

> 已派发的工作：全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。下一步：后续进度以群聊任务卡为准。

普通问话不会出现这条事件，也不会显示 Todo 或派发摘要。

## 验证

新增验证点：

- 全局 loop 自测：
  - `globalDispatchLaunchSummaryStreamsLive`
  - `globalProjectDispatchLaunchSummaryStreamsLive`
  - `globalOrdinaryAnswerHasNoDispatchLaunchEvent`
- 全局事件 UI 自测：
  - `dispatchLaunchUiFriendly`
  - `dispatchLaunchUiHidesProtocol`
- 静态 UI 自测：
  - 前端能识别 `dispatch_launch_summary` 流式事件。
  - 前端会保存 `agentMsg.dispatch_launch_summary`。
  - 后端会发出 `emitGlobalDispatchLaunchProgress`。

## 后续

后续可以把实时派发摘要升级成全局会话中的小型可展开进度块，让用户在流式阶段就能看到每个执行目标的状态，而不只是一行摘要文本。
