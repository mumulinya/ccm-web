# Final summary visible protocol quality v1

## Goal

把“最终总结普通文本不能泄漏内部协议字段”固化成质量门禁，避免 `CCM_AGENT_RECEIPT`、`trace_id`、`raw payload` 等技术内容进入用户可见文本框。

## Implemented

- `final_summary_quality.checks` 新增 `user_visible_protocol_sanitized`。
- 检查范围覆盖最终交付总结的 sections 和 `next_action`。
- 使用专门的窄正则拦截协议/trace/raw payload 字段，避免误伤合法文件路径。
- 自测覆盖完成态、失败态和 legacy raw payload 输入。

## Verification

- `npm run check`
- `npm run build:backend`
- `node --input-type=module -e "import('./ccm-package/dist/agents/delivery-report.js').then(({runMainAgentDeliveryReportSelfTest})=>{const result=runMainAgentDeliveryReportSelfTest(); console.log(JSON.stringify({pass:result.pass, finalSummaryQualityRequiresVisibleProtocolSanitizer:result.checks.finalSummaryQualityRequiresVisibleProtocolSanitizer, legacyProtocolTextSanitized:result.checks.legacyProtocolTextSanitized, legacyQualityChecks:result.legacy.final_summary_quality?.checks}, null, 2)); if(!result.pass) process.exit(1);})"`
- `npm run build:frontend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

结果：全部通过。
