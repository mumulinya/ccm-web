# 最终交付总览卡 v1

## 背景

对照 `D:\claude-code` 的最终回复链路，主 Agent 完成任务后不应该让用户从多条进展、回执或技术记录里拼结果。用户需要先看到“做完了什么、验收了什么、有没有风险、下一步怎么办”，Trace、session、原始回执等内部信息继续默认放在技术详情里。

## 本次升级

- 统一交付报告新增 `completion_card`，schema 为 `ccm-main-agent-completion-card-v1`。
- `completion_card` 汇总状态、涉及范围、验证数量、风险数量、完成亮点、验证结果、风险与下一步。
- 群聊任务卡后端直接返回 `delivery_report`、`completion_card`、`pickup_summary`，前端不再只能从零散字段推断。
- `buildMainAgentDisplayStream()` 会把 `summary.delivery_report` 带入 display stream 和 workchain completion summary，保证群聊主 Agent 的真实任务卡能拿到统一交付结构。
- `TaskExperienceCard` 在终态任务靠上展示“最终交付总览 / 未完成总览 / 停止总览”，交付明细保留，技术详情仍默认折叠。

## 用户可见效果

- 群聊主 Agent 完成任务后，用户先看到最终交付总览，再看执行队列、回执、交付明细等补充信息。
- 全局主 Agent 历史完成态同样展示最终交付总览。
- 失败态展示“未完成总览”，不会把原始错误、trace、session 放在主文案里。
- 普通问话仍不会显示 Todo 或交付卡。

## 验证

- 后端交付报告自测新增 completion card 断言。
- 全局主 Agent 自测新增 `executionRunsHaveCompletionCard`。
- 静态 UI 自测守护 `completionOverview`、`completion_card`、display stream 携带 delivery report。
- Playwright 渲染回归会检查群聊任务完成卡、全局历史完成卡、全局失败卡都能看到总览，并继续检查技术详情默认折叠。
