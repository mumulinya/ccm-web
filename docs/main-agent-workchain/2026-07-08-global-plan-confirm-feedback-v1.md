# Global plan confirmation feedback v1

## Goal

让全局主 Agent 的计划确认链路更接近 Claude Code 计划模式：用户确认执行前计划时，可以同时补充执行要求；主 Agent 后续执行、验收和总结都必须带着这段补充要求。

## Reference

参考 `D:\claude-code\src\components\permissions\ExitPlanModePermissionRequest\ExitPlanModePermissionRequest.tsx`：

- 退出计划模式时可携带用户反馈。
- 执行消息会把 plan 和 feedback 一起带入后续实现链路。
- 执行结束前需要保留验证/总结约束。

## Implemented

- 全局任务卡复用已有“确认执行时补充要求”输入框。
- `TaskExperienceCard` 现在把全局 `confirm` 动作识别为计划确认动作，并把 `accept_feedback` 一起发出。
- `/api/global-agent/runs/confirm` 将 `accept_feedback` 传给全局 Agent loop。
- `resumeGlobalAgentRun()` 会把确认反馈写入：
  - `plan_mode.accepted_feedback`
  - `plan_mode.accepted_feedback_history`
  - `plan_accept_feedback`
  - reasoning assertion
  - Trace 确认事件元数据
- 计划执行跟进文案会说明“带着你的补充要求继续执行”。
- 公开运行结果保留确认反馈字段，便于前端历史恢复。

## Verification

已执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- 直接调用 `runGlobalAgentLoopSelfTest()`：
  - `globalConfirmedPlanCarriesAcceptFeedback: true`
  - `globalConfirmedPlanHasExecutionFollowup: true`
