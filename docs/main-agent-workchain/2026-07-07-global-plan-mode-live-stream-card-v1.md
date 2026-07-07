# 全局主 Agent 计划实时流式展示 v1

日期：2026-07-07

## 背景

参考 `D:\claude-code` 的 `PlanApprovalMessage`：当任务进入计划确认阶段时，用户应该立即看到计划内容和确认动作，而不是等最终结果事件返回后才看到。

本项目上一版已经让全局主 Agent 生成 `plan_mode`，但等待确认的流式事件只展示了“等待授权确认”的文字，计划卡主要依赖最终 `result` 中的完整 run 数据。

## 本次升级

- 全局主 Agent 的 `confirmation_required` 事件现在会同步携带 `plan_mode/planMode`。
- 全局前端收到等待确认、澄清或计划事件时，会先构造轻量 `agenticRun`，让同一个 `TaskExperienceCard` 立即渲染。
- `global_stream` 消息下方新增实时计划卡区域，展示：
  - 执行前计划
  - 执行步骤
  - 影响范围
  - 只读探索
  - 验收标准
  - 确认/取消动作
- 最终 `result` 返回后仍会用完整 run 覆盖实时轻量 run。

## 用户可见规则

- 普通问话不会生成轻量 run，也不会出现 Todo/计划卡。
- 等待确认时，用户先看到友好计划说明和确认按钮。
- Trace、底层工具参数和排障信息继续默认收在“技术详情”。

## 回归覆盖

- `runGlobalAgentLoopSelfTest()` 新增 `globalPlanModeStreamsLive`，验证等待确认事件携带计划步骤。
- 静态自测检查全局前端消费 `event.plan_mode` 并渲染 `global-stream-plan-card`。
- 截图回归新增全局流式计划卡 fixture，断言“执行前计划”和“执行步骤”可见，技术详情默认折叠。
