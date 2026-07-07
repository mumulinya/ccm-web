# 全局状态查询展示直派接续状态 v1

## 背景

全局直派任务发生目标调整后，后端已经会把接续状态同步回全局会话。但用户也会直接问全局主 Agent：“现在进展怎么样？” 这时状态摘要不能只说“等待任务卡验收”，还应该明确告诉用户任务正在按新要求接续。

## 改动

- `backend/modules/global/global-agent.ts`
  - 新增 `summarizeDirectDispatchContinuationForStatus()`。
  - 全局状态摘要里的“最近全局直派任务”会展示：
    - 接续状态。
    - 最新补充/目标调整摘要。
    - 当前是停止旧执行轮、重核计划，还是接到同一任务继续处理。
  - 输出继续走 `sanitizeGlobalDirectAgentOutput()`，避免 trace、session、协议字段进入用户主文本。
- `runGlobalAgentIntentSelfTest()`
  - 扩展全局直派任务样本，加入 `last_continuation` 和 `goal_revision_interruption`。
  - 新增 `globalStatusShowsDirectDispatchContinuation` 断言。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态自测要求全局状态链路包含直派接续状态摘要。

## 用户体验

用户问“现在进展怎么样？”时，全局主 Agent 会把直派任务显示成类似：

`接续状态：先保留旧首页入口，只新增兼容开关；正在停止旧执行轮，再按新目标重核计划`

这不是完成总结；最终完成、验收和风险仍以群聊任务卡的最终总结为准。

## 验证

计划执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/global/global-agent.js').then(m=>{ const r=m.runGlobalAgentIntentSelfTest(); console.log(JSON.stringify({passed:r.passed, statusChecks:r.statusChecks}, null, 2)); if(!r.passed) process.exit(1); })"`

