# Legacy completion summary visible sanitizer v1

## Goal

让 `formatMainAgentCompletionReply` 在格式化历史 `workchain.completion_summary` 时也执行用户可见文本清洗，避免旧数据里的 `trace_id`、`raw payload`、`session_id`、`CCM_AGENT_RECEIPT` 重新出现在最终回复文本框。

## CC Reference

- `D:\claude-code\src\server\directConnectManager.ts` 过滤 `streamlined_tool_use_summary` 和 `post_turn_summary`，避免内部状态被当成普通消息转发。
- `D:\claude-code\src\utils\streamlinedTransform.ts` 把纯工具流变成结构化 summary，而不是直接把 raw tool stream 展示给用户。

## Implemented

- `formatMainAgentCompletionReply` 对以下字段统一清洗后再拼接：
  - `completion_summary.headline`
  - `completion_summary.evidence`
  - `completion_summary.verification`
  - `completion_summary.verification_status`
  - `completion_summary.acceptance`
  - `completion_summary.independent_review`
  - `completion_summary.risks`
  - `completion_summary.risk_status`
  - `completion_summary.next_action`
- 保留合法文件路径，例如 `src/app.ts`。
- 自测新增 legacy 结构：旧 completion summary 内含 `raw payload trace_id/session_id/task-notification/execution_lease` 时，格式化后的用户回复必须不泄漏内部协议词。

## Verification

- `npm run check`
- `npm run build:backend`
- `node --input-type=module -e "import('./ccm-package/dist/agents/workchain.js').then(({runMainAgentWorkchainSelfTest})=>{const result=runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:result.pass, legacyCompletionReplySanitizesVisibleSummary:result.checks.legacyCompletionReplySanitizesVisibleSummary, legacySummaryReply:result.legacySummaryReply}, null, 2)); if(!result.pass) process.exit(1);})"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

结果：全部通过。
