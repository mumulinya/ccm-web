# 子 Agent 执行上下文进展摘要 v1

## 背景

`D:\claude-code\src\services\AgentSummary\agentSummary.ts` 会为 coordinator mode 的子 Agent 周期性生成简短进展摘要，让用户和主 Agent 不必等到最终结果才知道子 Agent 正在做什么。

本项目已有 `agent_progress_summary`，但主要依赖派发记录、工作项、结果说明和通知。第三方写代码 Agent 长时间执行时，如果还没提交结果说明，用户可能只看到“等待中”。任务级执行上下文里其实已经有可用信号：执行轮次、最近一轮是否成功、上下文是否可续跑、是否降级到备份续跑方式。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 新增 `userAgentSessionStatus()`。
  - 新增 `userAgentSessionSummary()`。
  - 新增 `userAgentSessionEvidence()`。
  - `buildUserAgentProgressSummary()` 会把任务级子 Agent session 合并进用户可读进展摘要：
    - 没有结果说明时，用 session 摘要兜底。
    - 有结果说明时，session 作为“上下文”证据补充。
    - 用户可见文本只展示“已连续推进 N 轮”“上下文已保留，可接着做”等表达。
    - `nativeSessionId`、`session_id`、`task_agent_session` 等技术字段继续只留在技术详情。
- `runCollaborationUxSelfTest()`
  - 新增 `sessionProgressCard` 样本。
  - 断言子 Agent 进展摘要能显示执行轮次和上下文保留。
  - 断言用户可见摘要不暴露 session/native 字段。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 静态自测覆盖 session-aware progress summary。

## 用户体验

长任务中，用户不需要理解第三方写代码 Agent 的会话 ID，也能看到类似：

`已连续推进 2 轮；最近一轮已返回；上下文已保留，可接着做`

这不是最终交付结论，只是进度可见性。最终完成仍以主 Agent 的验收和交付总结为准。

## 验证

计划执行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- `node -e "import('./ccm-package/dist/modules/collaboration/collaboration.js').then(m=>{ const r=m.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:r.pass, failed:Object.entries(r.checks||{}).filter(([k,v])=>!v).map(([k])=>k)}, null, 2)); if(!r.pass) process.exit(1); })"`

