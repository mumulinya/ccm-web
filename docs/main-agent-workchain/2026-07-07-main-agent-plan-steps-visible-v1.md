# 主 Agent 执行前计划步骤可见化 v1

日期：2026-07-07

## 背景

参考 `D:\claude-code` 中 `ExitPlanModeTool` 和 `PlanApprovalMessage` 的链路：复杂任务应先把计划展示给用户，未明确的需求用问题澄清，普通问答不展示 Todo/计划。

本项目之前已经有群聊主 Agent 的 Plan Mode 和全局主 Agent 的确认摘要，但用户可见卡片里缺少稳定的“执行步骤”字段，用户难以感知主 Agent 接下来会按什么顺序工作。

## 本次升级

- 群聊主 Agent 的 `buildGroupPlanModePreflight` 新增 `steps`：
  - 理解需求与验收目标
  - 只读探索影响范围
  - 确认执行边界
  - 派发子 Agent 工作单
  - 验收结果并总结给用户
- 群聊任务卡 `plan_mode` 透传 `steps`，前端 `TaskExperienceCard` 渲染“执行步骤”。
- 全局主 Agent 新增 `ccm-global-main-agent-plan-mode-v1`：
  - 写入、高风险、执行类、派发类任务展示执行前计划。
  - 普通问答不生成 `plan_mode`。
  - 用户确认后把计划状态从 `awaiting_confirmation` 更新为 `confirmed`，终态更新为 `completed/cancelled/failed`。
- 全局主 Agent API 对外公开 `plan_mode/planMode`，让全局文本框和群聊任务卡使用同一套用户可见数据。

## 用户可见规则

- 用户可见区域展示目标、步骤、影响范围、只读探索、验收标准和下一步。
- 技术字段、Trace、原始工具参数、内部协议仍默认放入“技术详情”。
- 普通问话不展示 Todo 或计划卡。

## 回归覆盖

- 静态自测覆盖任务卡渲染“执行步骤”、群聊计划步骤、全局计划模式公开字段。
- `runCollaborationUxSelfTest()` 覆盖群聊任务卡和等待确认计划的步骤透传。
- `runGlobalAgentLoopSelfTest()` 覆盖：
  - 高风险任务等待确认时展示全局计划。
  - 用户确认后计划进入完成状态。
  - 普通问答不展示 `plan_mode`。
