# 全局任务完成总结可见链路 v1

## 背景

`D:\claude-code` 的 Agent 规则强调：子 Agent 完成后，结果不会自动成为用户正文；主 Agent 必须阅读结果，并用简洁、可信、用户能理解的话总结给用户。

本项目全局主 Agent 已有结构化交付报告和实时流消毒，但还有一些完成路径会直接使用 `run.final_reply` 或事件原文：

- 全局 mission 轮询到完成后，直接把 `runData.run.final_reply` 写回消息。
- mission 完成通知优先使用 `message.agenticRun?.final_reply`。
- 全局运行控制按钮更新后直接写 `run.final_reply`。
- 飞书桥接的非流式结果直接写 `run.final_reply`。
- completed / cancelled 等全局事件行还可能用普通压缩文本。

这些路径属于“完成后给用户看的总结”，应该和实时流一样遵循用户可见规则。

## 本次升级

- 新增 `formatGlobalRunVisibleReply`：
  - 优先读取结构化 `delivery_report` 的 Markdown / 用户文本。
  - 没有结构化报告时，再展示清理后的 `final_reply`。
  - 避免把内部协议词、Trace、session、原始 payload 放进正文。
- 全局 mission 完成轮询改为使用 `formatGlobalRunVisibleReply`。
- `global_mission_complete` 补发消息改为优先展示结构化交付总结。
- 运行控制按钮回填内容改为使用 `formatGlobalRunVisibleReply`。
- 飞书桥接非流式回复和回传结果也统一清理用户可见文本。
- 全局事件行中的 `decision`、`clarification_required`、`confirmation_required`、`paused`、`supervising`、`completed`、`cancelled` 改用用户可见清理。

## 用户体验

全局任务完成后，用户优先看到：

- 完成了什么。
- 涉及哪些改动或交付物。
- 做了哪些验证。
- 还有什么风险或下一步。

如果底层结果里混入 `CCM_AGENT_RECEIPT`、`trace_id`、`WorkerContextPacket` 等内部信息，正文会改成友好说明，技术内容仍保留在技术详情中。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `globalAgentCompletionPathsUseVisibleSummary`，检查：

- 存在 `formatGlobalRunVisibleReply`。
- 完成路径使用结构化交付报告。
- mission 完成、运行控制、非流式桥接不再直接展示 `final_reply`。
- completed 事件不再走普通 `compactStreamText(event.reply...)`。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `git diff --check -- frontend/src/components/global/GlobalAgent.vue scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/2026-07-07-global-completion-visible-summary-v1.md`
- `npm run check`
- `npm --prefix frontend run build`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run build`

以上验证均通过；空白检查只出现仓库既有的 CRLF 提示。
