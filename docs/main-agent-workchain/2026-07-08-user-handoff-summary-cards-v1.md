# User Handoff Summary Cards V1

## 背景

参考 `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts`：

- `streamlined_tool_use_summary` 会把工具调用压成用户可读的摘要字符串。
- `post_turn_summary` 会在每轮后记录 `status_category`、`recent_action`、`needs_action` 等可恢复状态。

本项目已有 `user_handoff`，但用户看到的主要是按钮和证据标签；对于实际使用来说，完成后还需要一块稳定的“交接摘要”，告诉用户本轮完成了什么、验证情况如何、是否有待关注事项、下一步点哪里。

## 本次升级

- 群聊主 Agent 的 `buildUserHandoffSummary` 新增 `summary_cards`。
- 全局主 Agent/项目任务卡的前端转换器 `buildUserHandoff` 同步生成 `summary_cards`。
- `TaskExperienceCard.vue` 在 `user_handoff` 内渲染 `handoff-summary-cards`，包含：
  - `完成内容`
  - `验证状态`
  - `待关注`
  - `下一步`
- 交接摘要位于操作按钮上方，用户先理解结果，再决定查看改动、核对交付总结或继续修复。
- 技术详情仍默认折叠，Trace、会话、执行器细节不进入用户主文本。

## 回归覆盖

- 群聊任务卡断言 `完成内容`、`验证状态`、`待关注`、`暂无待处理风险` 可见。
- 全局历史任务卡断言同一交接摘要结构可见。
- 后端自测增加 `userHandoffSummaryCardsVisible`，确保群聊任务卡真实携带 `summary_cards`。
- 新增 Playwright 截图：
  - `02c-user-handoff-summary-cards.png`

## 边界

- 本次不修改 TestAgent 业务逻辑。
- 普通问话仍不展示 Todo/交接卡。
- `summary_cards` 只用于用户可读交接；原始执行记录仍进入技术详情。
