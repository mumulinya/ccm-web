# Coded Coordinator Notification Digest v1

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts` 的协调器规则：子 Agent / worker 的完成通知虽然会进入消息流，但它们是内部信号，不应该被当成真人对话来简单回复“收到”或“谢谢”。主 Agent 应该把新信息提炼成用户能看懂的进展、缺口和下一步。

## 本次升级

- `buildCodedCoordinatorSummary()` 不再只输出“已收到 N 个子 Agent 回复”。
- 新增 `ccm-coded-coordinator-notification-digest-v1` 结构化摘要，按子 Agent 展示：
  - 当前状态：已提交结果、结果说明待补、执行未通过、遇到阻塞、部分完成等。
  - 用户可读结论：复用通知里的 summary/result，并经过内部协议清洗。
  - 下一步缺口：例如“补齐可验收的结果说明”“按失败原因继续处理”。
- LLM 不可用时，coded fallback 也能像项目负责人一样给用户总结结果，而不是把责任交给“上方各项目 Agent 的回复”。

## 用户体验

用户在群协作里看到的是：

- 哪个子 Agent 已经交付结果。
- 哪个子 Agent 还缺少可验收说明、验证证据或需要继续处理。
- 主 Agent 下一步会先处理什么。

内部词如 `<task-notification>`、`CCM_AGENT_RECEIPT`、`trace_id`、`session_id` 继续只留在技术详情或后台协议里。

## 验证

- `runCoordinatorProtocolSelfTest()` 增加 `codedNotificationDigestPass`。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加 `backendCoordinatorCodedSummarySynthesizesWorkerNotifications` 静态守护。
