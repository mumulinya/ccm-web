# Visible Workchain Role Language v3

日期：2026-07-08

## 背景

本轮继续收口群聊主 Agent 和全局主 Agent 的用户可见工作链路文案。目标是让普通用户看到的是“我、执行成员、最终验收、独立复核”等自然表述；内部协议、第三方 coding agent 工作单、TestAgent 原生 handoff 仍保留精确术语，避免破坏执行契约。

## 实现范围

- `backend/agents/work-items.ts`
  - 引入共享用户可见文案清洗器。
  - 将工作项依赖、解锁、派发、超时重排、验收提醒中的“主 Agent/子 Agent/下游 Agent”改为“我/执行成员/下游执行目标”。
  - 增加自测断言，防止工作项用户摘要重新泄漏旧角色词。

- `backend/modules/collaboration/collaboration.ts`
  - 收口执行成员进展、恢复接续、补充要求接续、结果复检、派发摘要、计划确认、完成前收尾、最终验收、计划核对、用户 handoff、Todo 当前步骤等用户展示文案。
  - 保留内部 schema、action id、TestAgent 原生工作单和第三方 agent 协议字段不变。

- `backend/modules/global/global-agent.ts`
  - 收口全局流式事件、TestAgent 计划/复核转发、飞书帮助、失败/派发/完成 fallback 的用户文案。

- `backend/agents/global/loop.ts`
  - 收口全局 dispatch Todo 当前状态 fallback。
  - 同步自测中用户可见角色断言为“项目执行成员”。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过
- `npm run check`：通过
- `npm run build:backend`：通过
- `npm run test:render-regression`：通过，已生成普通问话不显示 Todo、任务 Todo、技术详情折叠、执行成员摘要展开等截图
- `npm run test:replay-regression`：通过
- `npm run build:frontend`：通过

## 边界

- 没有修改 `backend/test-agent` 的业务流程。
- 没有替换第三方 coding agent 工作单中的协议词，例如 `CCM_AGENT_RECEIPT`、原生 handoff、ACK gate 等。
- 源码中仍会保留部分内部/自测/诊断语境下的“主 Agent/子 Agent/项目 Agent”，但这些不作为普通用户主文本展示。
