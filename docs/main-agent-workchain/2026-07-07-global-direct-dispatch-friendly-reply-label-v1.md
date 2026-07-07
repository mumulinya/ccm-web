# 全局直接派发接管说明文案 v1

本轮目标：继续对齐 `D:\claude-code` 的任务链路展示方式。全局主 Agent 把需求直接派发到群聊主 Agent 后，用户应该看到“已接管、下一步在哪里看、是否代表完成”等自然说明，而不是“回执”这类内部协议词。

## 改动

- `renderGlobalDirectGroupDispatchAcceptedSummary()` 的用户可见追加回复从“主 Agent 回执”改为“主 Agent 说明”。
- 保留内部工作单里的结构化结果协议要求，第三方写代码 Agent 仍能按 `CCM_AGENT_RECEIPT` 提交可验收结果。
- 后端 direct dispatch selftest 新增 `groupDirectDispatchUsesFriendlyReplyLabel`，确保接管摘要包含“主 Agent 说明”，且不再包含“主 Agent 回执”。
- 静态 UI/链路自测也检查 `backend/modules/global/global-agent.ts`，防止后续把旧文案写回来。

## 用户感知

- 全局会话里看到的是“主 Agent 说明”，更像正常接管反馈。
- “不代表需求已经完成”的提示仍保留，避免用户把派发成功误解为任务完成。
- 计划、执行、验收和最终总结仍回到群聊任务卡，技术协议和原始结果留在内部链路或技术详情。

## 验证

- 后端 `runGlobalAgentIntentSelfTest()` 覆盖直接派发摘要。
- `scripts/main-agent-decision-ui-selftest.mjs` 覆盖前端/后端旧文案回归。
