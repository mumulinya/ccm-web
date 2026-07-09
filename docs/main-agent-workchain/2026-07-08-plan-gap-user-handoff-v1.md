# Plan gap user handoff v1

## Goal

让最终交付总结发现计划缺口时，用户不只在“计划回顾”里看到缺口，也能在“接下来建议”和恢复入口里直接看到该先处理什么。

## Implemented

- `delivery-report` 从“计划回顾”里提取明确的 `计划缺口：...` 行。
- `user_handoff` 现在会优先使用计划缺口：
  - 主动作：`补齐计划缺口后继续`
  - 主动作详情：具体缺口文本
  - `unresolved`：包含计划缺口和其他风险
  - `evidence`：显示计划缺口数量
- 只提取带有具体内容的 `计划缺口：...`，不会把泛泛的 `计划核对：仍有缺口` 当成可执行缺口。
- 视觉回归新增真实任务卡样例，覆盖计划缺口主动作、待处理列表、技术详情默认折叠。

## Verification

已执行：

- `npm run check`
- `npm run build:backend`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `failedPlanReviewShowsGapDetail: true`
  - `failedHandoffPrioritizesPlanGap: true`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
