# Workchain visible protocol quality v1

## Goal

把主 Agent workchain 的用户可见链路也纳入“普通文本不泄漏内部协议”质量门禁，覆盖最终总结、Todo 当前计划、关键进展和下一步，避免 `trace_id`、`raw payload`、`CCM_AGENT_RECEIPT` 等技术字段进入用户文本框。

## CC Reference

- `D:\claude-code\src\utils\streamlinedTransform.ts` 会把纯工具消息转换成结构化 tool summary，而不是把原始工具流当普通文本输出。
- `D:\claude-code\src\server\directConnectManager.ts` 会过滤 `streamlined_tool_use_summary` 和 `post_turn_summary`，避免内部状态直接进入用户消息流。

## Implemented

- `buildFinalSummaryQuality` 新增 `user_visible_protocol_sanitized` 检查。
- 检查范围覆盖：
  - `user_visible_text`
  - `completion_summary.evidence`
  - `completion_summary.verification`
  - `completion_summary.acceptance`
  - `completion_summary.independent_review`
  - `completion_summary.risks`
  - `completion_summary.next_action`
  - `todo_plan.visible_steps/current_step/verification_reminder`
  - `progress_checkpoints.items`
- 叙述性证据和验证列表进入总结前统一经过 `sanitizeWorkchainUserText`。
- `completion.next_action` 进入普通总结前也会清洗。
- 自测新增反例：直接把 `trace_id raw payload` 放进用户可见证据时，质量门禁必须失败；通过正式构建链路时则会被清洗并通过。

## Verification

- `npm run check`
- `npm run build:backend`
- `node --input-type=module -e "import('./ccm-package/dist/agents/workchain.js').then(({runMainAgentWorkchainSelfTest})=>{const result=runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:result.pass, workchainQualityRequiresProtocolSanitizer:result.checks.workchainQualityRequiresProtocolSanitizer, workchainVisibleProtocolLeakSanitized:result.checks.workchainVisibleProtocolLeakSanitized, workchainQualityGateCatchesRawVisibleProtocol:result.checks.workchainQualityGateCatchesRawVisibleProtocol, rawLeakCheck:result.rawLeakQuality?.checks?.find(item=>item.id==='user_visible_protocol_sanitized')}, null, 2)); if(!result.pass) process.exit(1);})"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

结果：全部通过。
