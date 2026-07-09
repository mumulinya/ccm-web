# Workchain quality followup v1

## Goal

当 `workchain` 的最终总结质量门禁未通过时，把缺口转成用户可读的“还需补齐”提示和下一步，避免主 Agent 在缺少证据时仍像完整交付一样收尾。

## CC Reference

- `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts` 会在多步骤任务完成但缺少验证时触发 `verificationNudgeNeeded`，推动最终总结前补验证。
- `D:\claude-code\src\tools\TaskUpdateTool\TaskUpdateTool.ts` 对 V2 task 也保留类似验证提醒。

## Implemented

- 新增 `ccm-main-agent-quality-followup-v1`。
- 当 `final_summary_quality.required=true` 且 `passed=false` 时：
  - `completion_summary.quality_followup` 会列出缺失项。
  - `completion_summary.next_action` 优先变成“先补齐缺口，再给出最终交付总结”。
  - `formatMainAgentCompletionReply` 会展示“还需补齐”段落。
- 缺证据时的总结措辞从“已完成本轮处理”调整为“已有处理记录，但还缺少可验收的交付证据”。
- 普通问话不触发该 followup，因为 `final_summary_quality.required=false`。

## Verification

- `npm run check`
- `npm run build:backend`
- `node --input-type=module -e "import('./ccm-package/dist/agents/workchain.js').then(({runMainAgentWorkchainSelfTest})=>{const result=runMainAgentWorkchainSelfTest(); console.log(JSON.stringify({pass:result.pass, workchainQualityFailureCreatesUserFollowup:result.checks.workchainQualityFailureCreatesUserFollowup, workchainQualityFailureReplyShowsMissingItems:result.checks.workchainQualityFailureReplyShowsMissingItems, reply:result.incompleteQualityReply}, null, 2)); if(!result.pass) process.exit(1);})"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`

结果：全部通过。
