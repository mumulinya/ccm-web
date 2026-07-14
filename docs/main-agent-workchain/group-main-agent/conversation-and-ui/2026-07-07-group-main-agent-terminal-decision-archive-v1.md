# Group Main Agent Terminal Decision Archive V1

日期：2026-07-07

## 背景

完成态状态卡已经能展示“任务交付完成”和“交付总结”。但真实截图里还能看到创建任务时的“最近决策”，内容是“正在派发子 Agent”。这类历史计划在任务完成后继续作为顶部决策展示，会让用户误以为任务仍在执行。

## 改动

- `GroupMainAgentStatusCard.vue` 新增 `isTerminalCompletion`。
- 当状态已经是 `done / completed / failed / cancelled` 且有交付总结时，不再展示旧的 `latestDecision` 决策块。
- 进行中任务不受影响，仍显示最近决策、计划预览和“定位到消息”。
- 静态自测新增 `groupHidesStaleDecisionOnTerminalCompletion`。
- Playwright 渲染回归新增断言：完成态状态卡中 `.latest-decision` 必须隐藏。

## 用户体验

- 完成后的顶部状态只强调交付结果和下一步，不再混入“正在派发”的旧计划。
- 用户仍可在消息历史或任务卡里查看计划详情。
- 技术详情默认折叠策略不变。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`

## 后续

后续可以把这个规则扩展到全局主 Agent 历史卡：如果任务已经完成，全局消息列表优先展示最终交付摘要，旧的执行计划只作为历史上下文。
