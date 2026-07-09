# TestAgent Verdict Summary Bridge v1

日期：2026-07-09

## 目标

把 TestAgent 最新的 `requiredCheckSummary`、`acceptanceSummary` 和 `failureSummary` 结果接到群聊主 Agent / 全局主 Agent 的用户可见链路里。

主 Agent 不能只看 `passed`、`accept` 或一句“已完成”。如果 TestAgent 的 summary 里还有未覆盖、待确认、弱证据，主 Agent 必须把它转成用户能看懂的“需返工 / 需确认 / 先补证据”，原始 schema、artifact 路径和证据文件继续放技术详情。

## 改动

- `backend/modules/global/global-agent.ts`
  - 全局主 Agent 现在会直接消费 TestAgent verdict/report 里的 `requiredCheckSummary` 和 `acceptanceSummary`。
  - summary-only 的 `notVerified` 会进入“需返工”。
  - summary-only 的 `unknown` 会进入“等你确认”。
  - `matchStrength=fallback` 或 `evidenceSource=single_criterion_report_status` 这类弱验收证据会显示为“验收证据待确认”，不会自动当作通过。
- `backend/agents/workchain.ts`
  - 群聊/全局通用 workchain 增加 TestAgent summary 解析。
  - 没有 coverage 明细、只有 verdict summary 的 TestAgent 结果，也会触发最终总结质量门禁。
  - 弱验收证据会进入“这轮还需要确认”，下一步提示用户确认或补齐证据后再重新运行 TestAgent/独立复核。
- `backend/agents/delivery-report.ts`
  - done 状态的空白 fallback 不再写“本轮处理已完成”。
  - 最终总结质量门禁新增 `done_evidence_present`，避免只有模板句子也被当作真实交付证据。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码级断言，防止 TestAgent summary 桥接和 bare-done 证据门禁回退。

## 用户体验

- 用户看到的是“TestAgent 复核未通过”“验收证据待确认”“先补齐证据再最终总结”。
- `fallback`、`single_criterion_report_status`、本地报告路径、schema 等技术细节不会出现在主文本框。
- 普通问答不会显示 Todo 或交付报告；只有任务/复核链路触发这些卡片和总结。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- dist 自测：
  - `runMainAgentWorkchainSelfTest()`
  - `runMainAgentDeliveryReportSelfTest()`
  - `runGlobalAgentIntentSelfTest()`
  - `runGlobalAgentHistorySyncSelfTest()`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `npm run build:frontend`
- `git diff --check`（仅有既有 LF/CRLF warning，无 whitespace error）
