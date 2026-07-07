# 全局终态旧计划归档 V1

本轮目标：任务已经完成、失败或取消后，用户主视图应优先看到交付总结、未完成原因、下一步，而不是继续看到旧的“正在派发 / 正在执行”计划卡。

## 对照来源

- `D:\claude-code\src\components\messages\PlanApprovalMessage.tsx`：计划可以被用户调整，执行后不应把旧计划当成当前状态。
- `D:\claude-code\src\tools\BriefTool\prompt.ts`：用户可见信息要简短、明确，技术细节和过程记录不抢占主结果。

## 已实现

- `TaskExperienceCard` 新增终态判断：`completed / done / succeeded / failed / cancelled` 且已有交付总结时，不再在主视图展示旧的 `MainAgentDecisionCard`。
- 旧主 Agent 决策不会丢失，会以“历史计划”摘要保留在折叠的“技术详情”中。
- `globalAgentRunTaskCard` 和 `globalMissionTaskCard` 会携带 `mainAgentDecision / main_agent_decision`，未来全局历史写入决策数据时也能统一处理。
- 真实渲染回归新增断言：全局历史完成态带旧决策时，主视图不显示旧计划，但技术详情中仍保留归档摘要。

## 用户效果

- 用户看到的是“做完了什么、怎么验证、下一步是什么”。
- 旧计划、动作链和验证状态不再干扰完成态判断。
- 需要排查时仍可展开“技术详情”查看历史计划摘要。

## 验收

- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态守护。
- `scripts/main-agent-render-regression.mjs` 增加 Playwright 真实渲染断言。
