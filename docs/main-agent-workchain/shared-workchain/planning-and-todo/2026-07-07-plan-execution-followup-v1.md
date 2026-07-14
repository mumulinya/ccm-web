# 计划确认后执行跟进 v1

日期：2026-07-07

## 背景

参考 Claude Code 的 plan mode 链路后，主 Agent 在用户确认执行前计划之后，不能只把技术状态藏进内部记录里。用户需要看到“计划已经确认，正在按计划推进”，同时技术细节、Trace、原始协议仍默认折叠在技术详情里。

## 本次升级

- 后端确认计划草稿新增 `ccm-main-agent-plan-execution-followup-v1`，记录计划已确认、补充要求、下一步跟进和展示策略。
- 全局主 Agent 的 `buildGlobalPlanModeSummary()` / `updateGlobalPlanModeStatus()` 也会产出同一 follow-up 结构，自动继续和用户确认后的计划都能被 UI 直接渲染。
- 任务卡在计划已确认、自动继续或确认后执行中时展示“计划已确认，正在按计划执行”。
- 待确认计划仍展示确认输入框；确认后执行态不再展示确认按钮和补充输入框，避免用户误判还在等待确认。
- 全局主 Agent 的流式计划卡和群聊主 Agent 任务卡走同一渲染路径，普通问话不会展示该跟进块。
- 原始协议字段如 `CCM_AGENT_RECEIPT`、`trace_id` 继续留在技术详情，不进入用户可读正文。
- 执行队列里的运行态统一显示为“执行中”，避免把底层 `running` 状态直接暴露给用户。

## 回归覆盖

- `case-plan-confirmed-followup` 覆盖群聊任务卡的计划确认后执行跟进。
- 全局流式自动继续计划卡断言同样能展示执行跟进。
- Playwright 截图新增 `03c-plan-execution-followup.png`。
- 静态自测检查前端渲染、fixture、截图断言和后端 `buildAcceptedPlanModeDraft()` 字段。

## 用户体验原则

用户看到的是一句可理解的执行状态和下一步说明：主 Agent 正在按计划推进，并会在最终总结前逐项核对验收标准。技术判断、底层运行信息和原始协议只在技术详情中查看。
