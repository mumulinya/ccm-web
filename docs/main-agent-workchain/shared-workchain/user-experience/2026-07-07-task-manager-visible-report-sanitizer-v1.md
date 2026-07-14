# 任务管理页执行报告可见文本清洗 v1

本轮目标：继续把主 Agent / 子 Agent 的用户可见输出和内部协议分开。上一轮已经覆盖群聊任务卡和全局任务卡，但任务管理页的执行报告仍会直接读取 `delivery_summary`、worker notification 和结构化结果说明摘要。历史数据或第三方写代码 Agent 如果带着 `CCM_AGENT_RECEIPT`、`receipt-status`、`trace_id` 等内部词，仍可能出现在任务报告主视图里。

## 改动

- `TaskManager.vue` 接入 `sanitizeUserFacingAgentText` 和 `sanitizeUserFacingStructure`。
- 任务执行报告主视图使用 `currentDeliverySummary()` 的清洗副本展示：
  - 交付状态、参与 Agent、验证记录、阻塞/待补充、交付报告。
  - 主 Agent 计划、派发证据、依赖证据、返工证据。
- 结构化结果说明摘要使用清洗后的 `receiptEvidenceItems()`。
- worker notification 摘要使用 `currentWorkerNotifications()`，保留任务 ID 和状态字段，但摘要/结果文本会转换成用户可读表达。
- 任务执行看板的 `compactDashboardText()` 也走同一套清洗，避免列表摘要、阻塞和返工记录泄漏内部协议词。
- 原始 Trace、执行器记录、结构化 JSON 仍留在技术详情/原始块中，供排障使用。

## 用户效果

- 任务管理页里看到的是“结果说明 / 结果状态 / 技术信息已整理”这类表达。
- 用户不需要理解 `receipt`、`CCM_AGENT_RECEIPT`、`trace_id` 或 raw payload。
- 继续派发、停止任务、回滚、Trace 查看等操作仍使用原始任务对象，不受显示清洗影响。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`

本轮还会继续运行构建和主 Agent 回归，确认前端模板和现有任务链路没有回退。
