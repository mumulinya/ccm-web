# 执行前计划澄清问题 v1

## 背景

Claude Code 的 plan mode 会在计划确认前处理歧义：如果目标、范围、方案或验收标准不清楚，应该先问用户，而不是让用户面对一张只有风险摘要的计划卡。CCM 已有执行前计划、确认和退回调整，但用户有时仍不知道“具体要补充什么”。

## 本次升级

- `plan_mode` 新增 `clarification_questions` 和 `needs_clarification`。
- 主 Agent 会根据风险信号生成具体问题，例如：
  - 范围不清时确认优先模块。
  - 多项目协作时确认项目边界和顺序。
  - 迁移、支付、权限、部署等高风险需求确认兼容策略和验收重点。
  - 删除、清理、覆盖等破坏性操作确认授权。
- 任务卡和日常工作台都会显示这些问题。
- 用户通过“调整计划”反馈后，问题会标记为已按反馈确认，仍保持同一个 Task/Trace。

## 用户可见效果

- 用户能直接看到主 Agent 需要他确认的关键问题。
- 用户不需要展开技术详情，也不需要猜应该怎样修改计划。
- 确认前仍不会派发子 Agent 或修改文件。

## 验证

- 后端 UX 自测新增：
  - `awaitingPlanCardShowsClarificationQuestions`
  - `revisedPlanAnswersClarificationQuestions`
- 静态 UI 自测检查后端问题生成、前端任务卡渲染和计划模式自测覆盖。
- Playwright 渲染回归验证“已按反馈确认”和兼容问题在任务卡中可见。
