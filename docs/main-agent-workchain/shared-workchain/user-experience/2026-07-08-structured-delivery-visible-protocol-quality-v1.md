# Structured delivery visible protocol quality v1

## Goal

把主 Agent 交付卡里的用户可见字段也纳入“普通文本不泄漏内部协议”质量门禁，避免 `trace_id`、`raw payload`、`session_id` 等技术字段绕过最终总结正文检查。

## CC Reference

- `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts` 中 TodoWrite 本身不渲染普通工具消息，进度由专门的 todo 状态承载。
- `D:\claude-code\src\utils\messages.ts` 的 todo reminder 明确要求系统提醒不要对用户复述。
- `D:\claude-code\src\tasks\RemoteAgentTask\RemoteAgentTask.tsx` 从远端日志里提取 todo 状态，用结构化进度给用户展示，而不是把原始日志直接展示。

## Implemented

- `final_summary_quality.checks` 新增 `user_visible_cards_sanitized`。
- 检查范围覆盖 `completion_card`、`pickup_summary`、`user_handoff` 的用户可见字段。
- 只扫描标题、headline、状态文案、指标、证据、风险、下一步、handoff action 等展示字段，不扫描 `raw_report` 和 `technical_details`。
- 自测新增反例：当交付卡 headline 出现 `trace_id raw payload` 时，质量门禁必须失败。

## Verification

- `npm run check`
- `npm run build:backend`
- `node --input-type=module -e "import('./ccm-package/dist/agents/delivery-report.js').then(({runMainAgentDeliveryReportSelfTest})=>{const result=runMainAgentDeliveryReportSelfTest(); console.log(JSON.stringify({pass:result.pass, finalSummaryQualityRequiresVisibleCardSanitizer:result.checks.finalSummaryQualityRequiresVisibleCardSanitizer, visibleCardQualityGateCatchesProtocolLeaks:result.checks.visibleCardQualityGateCatchesProtocolLeaks, visibleCardLeakCheck:result.structuredLeakQuality?.checks?.find(item=>item.id==='user_visible_cards_sanitized')}, null, 2)); if(!result.pass) process.exit(1);})"`
- `npm run test:render-regression`
- `npm run test:replay-regression`

结果：全部通过。
