# Global Mission Handoff V1

日期：2026-07-07

## 背景

上一轮已经补齐群聊主 Agent 派发子 Agent 的自包含工作单。继续对齐 Claude Code coordinator 后发现：全局主 Agent 创建跨项目 mission 时，上游只把业务目标和验收文本写进子任务，还缺少“为什么派给这个目标、依赖谁、交付后如何回到全局汇总”的可追踪交接。

## 本次升级

- 全局任务创建子任务时生成 `mission_handoff`，复用 `ccm-self-contained-worker-handoff-v1`。
- `mission_handoff` 记录全局任务 ID、目标类型、目标名称、前置依赖、完成判定和全局汇总要求。
- 父任务 `mission_plan.target_handoffs` 会保留每个子目标的 handoff 摘要，便于技术详情和监工排查。
- 子任务时间线新增 `global_mission_handoff_ready`，用户可见文案是“全局 Agent 已补齐子任务交接”。
- 群聊主 Agent 收到全局子任务时，工作单里会出现“全局任务交接”，包括全局目标、派发原因、前置依赖和给全局 Agent 的交付要求。
- 直接项目任务、自动派发任务会继承全局 mission 的 worker packet、依赖和完成判定。
- 群聊内二级派发给项目子 Agent 时，会注入全局任务摘要，避免子 Agent 只看到局部需求而不知道最终要向全局交付什么。

## 用户体验原则

- 用户看到的是任务链路进展：全局 Agent 已派发、子任务交接已补齐、群聊/项目 Agent 正在处理。
- 技术字段如 `WorkerContextPacket`、`trace_id`、packet id 只留在技术详情和内部事件中。
- 最终总结仍使用统一交付报告：完成内容、涉及范围、验证结果、风险与待确认、下一步。

## 验证计划

- `npm run check`
- `npm run build`
- `node -e "const m=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks).filter(([,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1)"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:chat-experience`
- `npm run test:render-regression`
