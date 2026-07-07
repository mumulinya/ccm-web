# 2026-07-07 Unified Workchain V1

## 背景

本轮目标：参考 `D:\claude-code` 的任务链路，把本项目的群聊主 Agent 和全局主 Agent 都接到一条统一的用户可见工作链路上。

参考点：

- `D:\claude-code\docs\tools\task-management.mdx`：Task/Todo 双轨、状态、依赖、完成后继续检查。
- `D:\claude-code\docs\safety\plan-mode.mdx`：先理解和计划，再执行，技术细节不直接打扰用户。
- `D:\claude-code\docs\agent\coordinator-and-swarm.mdx`：Coordinator 负责理解、分配、综合结果。
- `D:\claude-code\src\tools\AgentTool\UI.tsx`：用户看到压缩后的进度、摘要和可展开详情。

## 本轮实现

新增 `backend/agents/workchain.ts`：

- 统一五阶段链路：理解需求、形成计划、调度/协作执行、检查验收、总结交付。
- 统一用户文案清洗：内部协议、Trace、session、runtime 等内容不会直接进入用户文本。
- 统一完成总结：完成后生成 `completion_summary`，包含证据、文件、验证、风险和下一步。
- 统一技术详情：Trace、Run、Task、Mission、Supervisor、执行记录等默认进入技术详情。
- 提供 `runMainAgentWorkchainSelfTest()`，覆盖内部信息不外泄、完成总结和技术详情记录。

群聊主 Agent：

- `backend/modules/collaboration/display.ts` 的 display stream 升级到 `ccm-streamlined-display-v2`。
- `buildTaskCardView()`、实时 Todo 决策、主 Agent 决策链都传入 `surface/status/phase/taskId`。
- 群聊文本框和任务卡都能拿到 `display_stream.workchain`。

全局主 Agent：

- `backend/agents/global/loop.ts` 在完成、失败、取消、监督中状态生成 `workchain/display_stream`。
- `publicGlobalAgentRun()` 返回 `display_stream/displayStream/workchain/final_report`。
- 全局普通回答不强行展示任务卡；执行类、监督类任务会展示完整链路和总结。

前端：

- `frontend/src/utils/agentDisplay.js` 支持直接读取 `workchain`。
- `TaskExperienceCard.vue` 和 `MainAgentDecisionCard.vue` 新增轻量工作链路条。
- 技术信息仍通过“技术详情”折叠展示。

## 用户体验约定

- 普通问答：直接自然回复，不展示 Todo。
- 执行类需求：展示主 Agent 工作链路和计划进度。
- 派发/监督中：明确告诉用户“已受理/监督中，不代表最终完成”。
- 最终完成：给出处理总结，必要时列出验证、风险和下一步。

## 验证

已通过：

```powershell
npm run check
npm run build
node -e "const m=require('./ccm-package/dist/agents/workchain.js'); const r=m.runMainAgentWorkchainSelfTest(); console.log(JSON.stringify(r.checks,null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/agents/global/loop.js'); m.runGlobalAgentLoopSelfTest().then(r=>{ console.log(JSON.stringify({pass:r.pass, completedRunsHaveWorkchain:r.completedRunsHaveWorkchain, workchainSelfTestPasses:r.workchainSelfTestPasses},null,2)); if(!r.pass) process.exit(1); })"
node scripts/main-agent-decision-ui-selftest.mjs
npm run test:render-regression
npm run test:chat-experience
npm run test:replay-regression
npm run test:code-changes
```

其中截图回归产物位于 `scratch/render-regression/` 和 `scratch/replay-regression/`。
