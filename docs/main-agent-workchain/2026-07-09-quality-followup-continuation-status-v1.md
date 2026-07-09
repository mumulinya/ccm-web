# Quality Followup Continuation Status v1

## 背景

质量补齐按钮已经会发出 `source: "quality_followup"`，并把补齐交付证据、验证结果、验收结论的默认消息传给同一任务继续接口。群聊任务本身会保存 followup、timeline 和 collaboration state，但用户可见接续状态仍可能显示成泛化的“补充要求已接收”。

## 改动

- 群聊主 Agent 的 continuation decision 识别 `quality_followup` 来源。
- 用户可见接续状态改为：
  - 标题：“交付总结补齐已接上”
  - 处理方式：“补齐交付总结”
  - 主说明：“我已接上交付总结补齐，会补齐交付证据、验证结果和验收结论。”
  - 下一步：“补齐最终总结缺口，完成后重新给你一份可验收总结。”
- 前端 `taskExperience` 的历史消息兜底归一化也识别同一来源，避免旧消息缺少完整 `continuation_status` 时退回普通补充文案。

## 边界

- 不改变 `/api/tasks/continue` 的执行协议。
- 不修改 TestAgent 业务逻辑。
- 技术详情继续保留原始 source、kind、work item 等字段。

## 验证

- `runCollaborationUxSelfTest()` 新增 `qualityFollowupContinuationDecision`，覆盖策略、标题、route label、headline、next action 和 timeline type。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态守卫，覆盖后端和前端兜底文案。
