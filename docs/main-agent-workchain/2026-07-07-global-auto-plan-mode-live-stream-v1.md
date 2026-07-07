# 全局主 Agent 自动执行计划实时展示 v1

日期：2026-07-07

## 背景

上一版已经让全局主 Agent 在“等待确认”时实时展示执行前计划。继续对齐 `D:\claude-code` 的 Todo/Plan 工作感知方式后，发现已授权或低风险自动执行场景仍有缺口：主 Agent 会生成计划，但用户通常先看到工具执行事件，不一定先看到计划卡。

## 本次升级

- 全局主 Agent 生成 `plan_mode` 后，如果不需要用户确认，会立即流出 `plan_mode_ready` 事件。
- `plan_mode_ready` 会携带 `plan_mode/planMode`，前端沿用统一的 `TaskExperienceCard` 实时展示：
  - 执行前计划
  - 执行步骤
  - 影响范围
  - 只读探索
  - 验收标准
- 等待确认场景仍由 `confirmation_required` 携带计划，不重复弹出确认前计划事件。
- 普通问答不会产生 `plan_mode_ready`，也不会展示 Todo/计划卡。

## 用户可见规则

- 自动执行任务：用户先看到计划卡和当前步骤，再看到工具执行进度。
- 等待确认任务：用户看到计划卡和确认/取消按钮。
- 技术参数、Trace、原始工具输出继续默认收在“技术详情”。

## 回归覆盖

- `runGlobalAgentLoopSelfTest()` 新增：
  - `globalAutoPlanModeStreamsLive`
  - `globalOrdinaryAnswerHasNoPlanModeEvent`
- 静态自测检查后端、前端和截图 fixture 都覆盖 `plan_mode_ready`。
- 截图回归覆盖两类全局流式计划卡：
  - 等待确认计划卡
  - 已授权自动执行计划卡
