# Plan gap next action v1

## Goal

让计划缺口不只出现在“计划回顾”和“接下来建议”，还要进入最终总结的“下一步”和“回来继续看这里”的恢复入口。用户回来继续处理时，第一眼就能知道该补哪个计划项。

## Implemented

- `collectDeliveryNextAction()` 增加计划回顾输入。
- 没有显式 `next_action` 时，如果存在 `计划缺口：...`，最终下一步会优先生成：
  - `先补齐计划缺口：...`
- `pickup_summary.resume_action` 和 `completion_card.next_action` 复用同一条下一步。
- 视觉回归样例覆盖：
  - 交付总结“下一步”优先显示计划缺口
  - pickup 恢复入口优先显示计划缺口
  - 技术详情仍默认折叠

## Verification

已执行：

- `npm run check`
- `npm run build:backend`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `failedHandoffPrioritizesPlanGap: true`
  - `failedNextActionPrioritizesPlanGap: true`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
