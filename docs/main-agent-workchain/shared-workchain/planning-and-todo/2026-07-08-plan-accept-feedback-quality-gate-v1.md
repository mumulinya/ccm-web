# Plan accept feedback quality gate v1

## Goal

把“用户确认执行计划时补充的要求必须进入最终计划回顾”固化成最终总结质量门禁，避免后续改动只执行了反馈，却没有在用户可见总结里说明。

## Implemented

- `final_summary_quality.checks` 新增 `plan_accept_feedback_visible`。
- 当源数据里存在 `accepted_feedback` / `plan_accept_feedback` 时，质量门禁要求：
  - “计划回顾”包含 `确认补充要求`
  - “计划回顾”包含用户补充要求原文
- 群聊主 Agent 和全局主 Agent 的交付总结自测都覆盖该门禁。

## Verification

已执行：

- `npm run check`
- `npm run build:backend`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `groupFinalSummaryQualityRequiresAcceptedFeedback: true`
  - `globalFinalSummaryQualityRequiresAcceptedFeedback: true`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
