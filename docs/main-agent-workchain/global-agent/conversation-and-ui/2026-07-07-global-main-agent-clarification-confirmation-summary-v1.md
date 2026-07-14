# 全局主 Agent 澄清与授权摘要 v1

日期：2026-07-07

## 目标

参考 Claude Code 的 `AskUserQuestion` 交互思路，把全局主 Agent 的“需要补充信息”和“等待授权确认”做成用户能看懂的结构化展示：

- 普通问答不展示 Todo、不展示任务卡。
- 需要用户补充时，只展示问题、原因、建议回复方式和下一步。
- 需要授权时，只展示动作、风险、目标和确认/取消入口。
- `trace_id`、`session_id`、pending tool 参数、原始 payload 等技术内容继续默认收进折叠的技术详情。

## 本次改动

- 后端 `backend/agents/global/loop.ts`
  - 新增 `ccm-global-main-agent-clarification-summary-v1`。
  - 新增 `ccm-global-main-agent-confirmation-summary-v1`。
  - 在 `clarification_required` / `confirmation_required` SSE 事件中同步输出摘要。
  - 在等待状态运行对象中持久化摘要，恢复、确认、取消或完成后清理等待摘要。
  - 扩展全局 loop 自测，覆盖澄清摘要、授权摘要、SSE 透传和协议隐藏。

- 后端 `backend/modules/global/global-agent.ts`
  - `publicGlobalAgentRun` 公开 `clarification_summary` / `confirmation_summary` 及 camelCase 兼容字段。
  - 实时状态和桌宠提示优先使用摘要中的用户可读问题/说明。

- 前端
  - `frontend/src/utils/taskExperience.js` 将全局等待状态转换为 `user_request_summary`。
  - `frontend/src/components/tasks/TaskExperienceCard.vue` 新增用户请求摘要区块。
  - `frontend/src/components/global/GlobalAgent.vue` 保留 SSE 摘要字段，并为澄清场景提供“补充信息”入口提示。

## 用户体验

全局主 Agent 不再只给用户一段泛泛的“需要确认/需要补充”文本，而是明确告诉用户：

- 当前为什么停下。
- 需要回答哪个问题。
- 可以按什么格式补充。
- 确认后会发生什么。

技术细节仍可展开排查，但默认不打扰普通用户阅读。

## 验证计划

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- 编译产物中的 `runGlobalAgentLoopSelfTest`
- `npm run build:frontend`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `git diff --check`
