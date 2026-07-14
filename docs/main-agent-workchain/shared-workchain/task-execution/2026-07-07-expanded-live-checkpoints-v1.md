# 主 Agent 阶段进展补全 V1

本轮目标：继续对齐 Claude Code 的进度可见性。长任务中，用户不应该只看到“正在处理”，而要能看懂主 Agent 已经走到哪一步：计划、派发、回执、验收、返工、恢复、全局监工。

## 对照来源

- `D:\claude-code\src\tools\TodoWriteTool\prompt.ts`：复杂任务需要持续更新任务状态，让用户知道当前进展。
- `D:\claude-code\src\tools\AgentTool\AgentTool.tsx`：子 Agent 会向父流程持续提供 progress / completed 状态，父流程负责汇总。

## 已实现

- `backend/agents/workchain.ts` 扩展 timeline 到 checkpoint 的友好映射：
  - 执行前计划确认/调整
  - 子 Agent 启动、失败、提交结果
  - 主 Agent 验收门禁
  - 精准返工、自动按缺口返工、下一步派发
  - 恢复接续、执行器切换、权限状态校正
  - 全局监工检查、返工、等待用户、最终通过
  - 全局直派完成/撤销同步
- `backend/modules/collaboration/collaboration.ts` 新增全局监工 timeline 写入：监工循环、返工、等待用户、完成通过都会进入父任务时间线。
- 这些 checkpoint 只展示自然语言阶段，不展示 `trace_id`、`session_id`、`CCM_AGENT_RECEIPT`、`WorkerContextPacket`。

## 用户效果

- 群聊主 Agent 任务卡和全局任务卡能显示更多真实阶段边界。
- 用户可以看到“子 Agent 已提交结果”“主 Agent 已发起精准返工”“全局监工已安排返工”等可理解状态。
- 技术排查数据仍默认折叠在技术详情或 Trace 中，不打扰日常阅读。

## 验收

- `runCollaborationUxSelfTest()` 新增阶段事件 checkpoint 断言。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态守护。
- `scripts/main-agent-render-regression.mjs` 增加 Playwright 真实渲染断言，覆盖恢复、回执、返工、全局监工 checkpoint。
