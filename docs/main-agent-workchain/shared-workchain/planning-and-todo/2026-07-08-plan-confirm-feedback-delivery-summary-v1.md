# Plan confirm feedback delivery summary v1

## Goal

让群聊主 Agent 和全局主 Agent 在用户确认执行计划时填写的补充要求，不只进入执行链路，也能在最终交付总结的“计划回顾”里明确展示。

## Implemented

- `delivery-report` 新增确认补充要求提取逻辑，统一读取：
  - `plan_mode.accepted_feedback`
  - `plan_mode.accepted_feedback_history`
  - run/task/report/summary 上的 `plan_accept_feedback`
- 最终交付总结的“计划回顾”新增用户可读行：
  - `确认补充要求：...`
- 计划回顾最终展示行不再被分号拆散，避免“计划范围”和“计划步骤”在用户文本框里变成碎片行。
- 用户可见文本继续经过主 Agent 术语和协议清理，底层字段、trace、执行协议不进入普通文本框。
- 后端自测覆盖群聊主 Agent 和全局主 Agent 两种交付总结。
- Playwright 渲染回归样例增加“确认补充要求”可见断言，确保真实页面能展示。

## Verification

已执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `groupPlanReviewIncludesAcceptedFeedback: true`
  - `globalPlanReviewIncludesAcceptedFeedback: true`
