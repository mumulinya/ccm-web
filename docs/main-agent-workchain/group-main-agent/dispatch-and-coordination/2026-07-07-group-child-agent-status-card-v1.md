# Group Child Agent Status Card v1

## 背景

群聊主 Agent 后端已经能生成 `ccm-group-child-agent-status-summary-v1`，状态追问也会引用它。但顶部“主 Agent 状态”卡仍只显示粗略的“执行中”，用户需要从任务卡或技术详情里推断哪些子 Agent 已完成、哪些还在执行、哪些需要补齐。

## 改动

- `GroupMainAgentStatusCard.vue` 新增“子 Agent 状态”区块。
- 直接消费 `child_agent_status_summary / childAgentStatusSummary`：
  - 汇总句：已完成、处理中、等待中、待补齐。
  - 计数：处理中 / 等待 / 待补齐 / 完成。
  - 重点行：最多展示 4 个最需要关注的子 Agent。
- 技术字段、trace、session、底层执行记录仍留在折叠的“技术详情”里。

## 用户可见规则

- 有子 Agent 状态数据时展示。
- 完成态显示已收齐，执行态显示处理中/等待，缺口态突出待补齐。
- 不展示 `CCM_AGENT_RECEIPT`、`trace_id`、`session_id` 或 raw payload。

## 验收

- Playwright 渲染回归在 `case-group-main-current-todo` 断言“子 Agent 状态”可见。
- 静态自测新增 `groupRendersChildAgentStatusSummary`。
