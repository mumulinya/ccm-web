# 全局直接派发完成回写 V1

本轮目标：全局主 Agent 直接把任务派发给群聊主 Agent 后，不能只停留在“已派发”。群聊任务真正完成并通过验收时，需要把最终总结同步回全局 Agent 会话，让用户在全局入口也能看到闭环结果。

## 问题

上一轮已经补齐了全局直接派发的工作单和任务链路，但链路只证明“群聊主 Agent 已接管”。如果用户后续停留在全局 Agent 页面，可能看不到群聊任务最终验收后的结果。

## 本次实现

- 全局 `send_group_cmd` 派发时会携带 `ccm-global-direct-dispatch-v1` 元数据，包括全局 run、全局会话、trace 和 handoff 摘要。
- 群聊任务创建时把该元数据保存到 `workflow_meta.global_direct_dispatch`。
- `updateTask()` 在任务首次进入 `done` 且 `acceptance_gate_passed === true` 时，生成用户可读最终总结并追加到对应全局 Agent 会话。
- 回写后会在任务时间线追加“全局 Agent 会话已同步最终总结”事件，并写入 trace。
- 回写内容只展示用户能看懂的交付摘要；Trace、回执、内部协议仍保留在群聊任务卡技术详情里。
- 通过 `completion_notified_at` 防止重复回写。

## 用户体验

- 用户在全局 Agent 下发群聊任务后，先看到“已派发，不代表完成”。
- 群聊主 Agent 真正完成、验收通过后，全局 Agent 会话自动出现最终总结。
- 普通问话仍不创建任务，也不会显示 Todo 或交付报告。

## 验证

- `runCollaborationUxSelfTest()` 新增：
  - 只有全局直接派发任务、首次完成且验收通过时才触发回写。
  - 最终总结包含“通过验收/最终总结”这类用户语言。
  - 用户可见总结不泄漏 `trace_id`、`global_run_id`、`WorkerContextPacket` 或 `CCM_AGENT_RECEIPT`。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态检查，防止移除派发元数据、完成回写钩子或任务时间线事件。

