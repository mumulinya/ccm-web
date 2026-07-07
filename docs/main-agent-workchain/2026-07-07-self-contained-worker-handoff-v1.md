# Self-Contained Worker Handoff V1

日期：2026-07-07

## 背景

参考 Claude Code coordinator 的工作方式后，主 Agent 派发子 Agent 时必须保证工作单自包含。子 Agent 可能是 Claude Code、Cursor 或其他第三方写代码 Agent，它们不能天然看到用户完整对话，所以主 Agent 不能只写“按上面的要求处理”。

## 本次升级

- 新增 `backend/agents/worker-handoff.ts`，统一生成 `ccm-self-contained-worker-handoff-v1`。
- 工作包包含用户目标、派发原因、允许范围、禁止范围、前置依赖、文档依据、契约注入、验证要求、完成判定、ACK gate 和 `CCM_AGENT_RECEIPT` 回执结构。
- 群聊主 Agent 跨 Agent 派发、任务队列直接执行、`/api/tasks/auto-assign` 都接入同一套 handoff。
- 派发前会写入 `worker_handoff_ready` 时间线，用户看到的是“工作单已补齐”；技术详情保留 `WorkerContextPacket` 与 packet id。
- 任务卡 UX 自测新增“工作单已补齐”人话展示检查，避免把协议字段暴露到用户可见文本。
- 新增 `/api/orchestrator/worker-handoff/self-test`，可单独检查 handoff 协议完整性。

## 用户体验原则

- 普通问话不展示任务 Todo 或 handoff。
- 真正开发任务才展示计划、派发、执行、验收、总结。
- 用户可见文案说清“正在做什么、谁在做、做完如何验收”。
- `CCM_AGENT_RECEIPT`、trace、packet id、runtime session 等内容只放在技术详情或内部提示词。

## 覆盖路径

- 群聊主 Agent -> 子 Agent：`processCrossAgents` 生成自包含工作包并记录 lifecycle。
- 任务队列 -> 项目 Agent：直接任务执行前生成同样工作包。
- auto-assign -> 项目 Agent：旧的简短提示词升级为完整工作包。
- 诊断接口：新增 worker handoff self-test。

## 验证计划

- `npm run check`
- `npm run build`
- `node -e "const m=require('./ccm-package/dist/agents/worker-handoff.js'); console.log(JSON.stringify(m.runWorkerHandoffSelfTest().checks,null,2))"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:chat-experience`
- `npm run test:replay-regression`
- `npm run test:code-changes`
