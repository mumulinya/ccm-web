# 群聊旧完成消息可见摘要 v1

## 背景

`D:\claude-code` 的 coordinator 规则要求：worker / 子 Agent 的结果是内部信号，主 Agent 要理解后再向用户总结；不能把 `<task-notification>`、结构化结果说明、trace、session 或原始 payload 直接当作用户正文。

本项目主链路已经有任务卡、交付总结、技术详情折叠等展示，但两个旧后端接口仍会直接把子 Agent 原文截断后发到群聊：

- `/api/tasks/execute`：`任务执行完成/中` 后拼接 `taskResult.substring(...)`。
- `/api/review`：`代码审查完成` 后拼接 reviewer 原始输出。

这会让第三方写代码 Agent 的 `CCM_AGENT_RECEIPT`、`WorkerContextPacket`、`trace_id`、原始 JSON 或审查提示词残片进入用户可见气泡。

## 本次升级

- 新增 `appendLegacyTaskExecutionGroupReport`：
  - 用户正文使用 `buildTaskDeliveryReport` / `buildTaskGroupReportMessage`。
  - 原始 Agent 输出进入 `technical_content` / `raw_result`。
  - 消息带 `delivery_summary` / `delivery_report`，后续仍可由任务卡和技术详情承接。
- 新增 `appendLegacyCodeReviewGroupReport`：
  - 用户正文只展示每个 reviewer 的简短审查摘要。
  - JSON 审查结果会提取 issue 数量和 overall。
  - reviewer 原始输出进入 `review_results` / `technical_content`。
- 后端共享的 `sanitizeMainAgentUserText` 扩展识别：
  - `<task-notification>`
  - `receipt-status`
  - `session_id`
  - `WorkerContextPacket`
  - `raw receipt` / `raw payload`
  - `raw_report`

## 用户体验

旧接口现在会展示类似：

```text
任务已完成，交付总结已整理。
```

或：

```text
代码审查完成：web-app
- reviewer-a：发现 2 个建议（高 0 / 中 1 / 低 1）；总体可合入
- reviewer-b：暂未发现明确问题
原始审查输出默认收在技术详情里。
```

而不是把子 Agent 原始长文本、结构化结果说明或内部协议直接显示给用户。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `backendLegacyGroupMessagesUseVisibleSummaries`，检查：

- 旧任务执行消息走 `appendLegacyTaskExecutionGroupReport`。
- 旧代码审查消息走 `appendLegacyCodeReviewGroupReport`。
- 消息保留 `delivery_report` / `technical_content` / `review_results`。
- 后端 sanitizer 覆盖 `task-notification`、`WorkerContextPacket`、`raw payload`。
- 不再存在旧的 `taskResult.substring(0, 300)` 和 `reviewResults.map(...substring...)` 正文拼接模式。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `git diff --check -- backend/modules/collaboration/collaboration.ts backend/modules/collaboration/display.ts scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/2026-07-07-group-legacy-completion-message-visible-summary-v1.md`
- `npm run check`
- `npm run build:backend`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run build`

以上验证均通过；空白检查只出现仓库既有的 CRLF 提示。
