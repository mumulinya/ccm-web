# 执行前计划退回调整闭环 v1

## 背景

Claude Code 的 plan mode 不只是“确认后执行”。用户拒绝计划后，系统会留在计划模式，让 Agent 按反馈修订计划，再重新请求确认。CCM 之前已有执行前计划和确认按钮，但缺少“退回调整计划”的闭环，用户不满意计划时只能取消或绕到任务详情补充说明。

## 本次升级

- 群聊任务卡在 `awaiting_confirmation` 状态新增“调整计划”动作。
- 前端会收集用户反馈并调用 `/api/usability/intake/revise`。
- 后端保持同一个 Task/Trace，不派发子 Agent、不进入执行队列，只更新 `plan_mode` / `intake_draft`。
- 调整后的计划卡显示“计划调整”、用户反馈、下一步重新确认提示。
- 日常工作台的“调整计划”入口也接入同一条 revise API，避免不同入口行为不一致。
- 技术记录、Trace、修订次数和 timeline 仍放在技术详情或后端记录中。

## 用户可见效果

- 用户看到计划不合适时，可以直接点“调整计划”。
- 主 Agent 会把反馈纳入执行前计划，并继续等待用户确认。
- 只有用户点击“确认执行”后，才会派发子 Agent 或修改文件。

## 验证

- 后端 UX 自测新增：
  - `awaitingPlanCardCanRevise`
  - `revisedPlanCardStaysInPlanMode`
  - `revisedPlanFeedbackVisible`
- 静态 UI 自测检查后端 revise API、前端任务卡和前端 action handler。
- Playwright 渲染回归新增“计划退回调整”真实页面断言。
