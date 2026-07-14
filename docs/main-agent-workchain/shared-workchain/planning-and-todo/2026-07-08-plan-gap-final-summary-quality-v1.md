# Plan gap final summary quality v1

## Goal

把“有计划缺口时，最终下一步必须指向计划缺口”固化成最终总结质量门禁，防止后续实现退回泛泛的“继续处理”文案。

## Implemented

- `final_summary_quality.checks` 新增 `plan_gap_next_action`。
- 当“计划回顾”里存在 `计划缺口：...` 时，质量门禁会检查：
  - `下一步` 是否包含 `计划缺口`
  - `下一步` 是否包含具体缺口文本
- 失败交付自测覆盖该质量门禁，确保计划缺口、下一步、恢复入口和最终总结质量检查保持一致。

## Verification

已执行：

- `npm run check`
- `npm run build:backend`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `failedNextActionPrioritizesPlanGap: true`
  - `failedFinalSummaryQualityRequiresPlanGapNextAction: true`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
