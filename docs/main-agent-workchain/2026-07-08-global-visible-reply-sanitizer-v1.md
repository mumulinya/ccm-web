# Global visible reply sanitizer v1

## 背景

全局主 Agent 已经有计划、执行、验收和最终总结链路，但部分外围路径仍可能直接复用 `final_reply`、历史同步内容或宠物气泡文本。如果模型或外部执行器误把 `CCM_AGENT_RECEIPT`、`<task-notification>`、`trace_id`、`raw payload` 等协议内容写入最终回复，用户主文本框可能看到不该出现的技术细节。

## 本次升级

- 新增 `buildGlobalVisibleReplyContent()`，统一清洗全局主 Agent 的用户可见回复。
- 当可见文本包含内部协议时，主文本替换为“技术细节已放入技术详情”的友好说明。
- 原始回复不丢弃，写入 `technical_content`，并挂到 `workchain/display_stream` 的技术详情段。
- `completeRun()` 和 `completeGlobalAgentSupervision()` 都接入同一套清洗逻辑。
- `publicGlobalAgentRun()`、飞书回复、旧 `/api/global-agent/chat` 返回、宠物完成气泡、历史同步都改为使用清洗后的可见回复。
- 历史同步如果收到旧的协议文本，会把主内容清洗成人话，把原文放进 `technical_content`。

## 用户体验

- 普通问话不会因为模型误吐协议串而展示 Todo 或内部协议。
- 执行类任务仍能显示计划、进度和最终总结。
- 用户默认看到友好摘要；展开技术详情时可以看到原始回复，用于排查。

## 验证

- `runGlobalAgentLoopSelfTest()` 增加普通问话协议泄漏场景：
  - 用户可见 `final_reply` 不包含 `CCM_AGENT_RECEIPT` / `trace_id`。
  - 原始内容进入 `final_report.technical_content` 和 `display_stream.technical_details`。
  - 该普通问话不触发计划模式。
- `runGlobalAgentHistorySyncSelfTest()` 增加历史消息协议清洗场景：
  - `content` 不展示协议。
  - `technical_content` 保留原文。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态回归检查，防止后续删除统一清洗入口。
