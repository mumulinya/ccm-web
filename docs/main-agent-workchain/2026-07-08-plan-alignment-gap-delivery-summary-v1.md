# Plan alignment gap delivery summary v1

## Goal

让群聊主 Agent 和全局主 Agent 的最终交付总结不只显示“计划核对：仍有缺口”，还要把用户真正需要处理的计划缺口说清楚。

## Reference

参考 `D:\claude-code` 的计划模式确认链路：计划进入执行后，最终反馈需要让用户知道计划是否被落实、还有哪些验证或交付项没有覆盖。技术字段、内部 id、trace 等只应留在技术详情。

## Implemented

- `delivery-report` 新增计划偏差/缺口提取：
  - `plan_alignment.deviations`
  - `plan_alignment.gaps`
  - `remaining_gaps`
  - `uncovered_steps`
  - failed `checks`
- 最终交付总结的“计划回顾”新增用户可读行：
  - `计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）`
- 内部 id 如 `criterion_1` 不进入普通文本框。
- “计划缺口”在展示顺序上靠前，避免被任务卡每个 section 的前 4 行展示限制隐藏。
- Playwright 渲染回归新增真实 DOM 断言，覆盖缺口可见和内部 id 不可见。

## Verification

已执行：

- `npm run check`
- `npm run build:backend`
- 直接调用编译产物 `runMainAgentDeliveryReportSelfTest()`：
  - `failedPlanReviewShowsGapDetail: true`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
