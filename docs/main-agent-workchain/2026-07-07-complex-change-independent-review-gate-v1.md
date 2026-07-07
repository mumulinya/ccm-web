# 复杂变更独立复核门禁 V1

本轮目标：参考 Claude Code 对非平凡实现的验证要求，让群聊主 Agent 在复杂代码变更完成前，不只依赖实现 Agent 自己的回执，而是要求另一个 Agent 或第三方写代码 Agent 提供独立复核证据。

## 参考来源

- `D:\claude-code\src\constants\prompts.ts` 中的验证契约：非平凡实现完成前需要独立、对抗式验证，主 Agent 对最终报告负责。
- 本项目已有 `request_review` 的 Agent-to-Agent 通道，以及 `CCM_AGENT_RECEIPT` 结构化回执。

## 实现范围

- 新增复杂变更判定：3 个以上文件、后端/API、数据库、权限、安全、部署、配置、锁文件等变更会触发独立复核门禁。
- 新增 `buildIndependentReviewGate()`：
  - 可读取 `request_review` 被采纳并续跑的证据。
  - 可读取第三方 Agent 在 `CCM_AGENT_RECEIPT.independentReview` / `codeReview` 中返回的 reviewer、verdict、summary、evidence。
- `buildAcceptanceGate()` 增加 `independent_review` 检查项。
- `buildDeliverySummary()` 输出 `independent_review_required`、`independent_review_gate`、`independent_review_gate_passed` 和 `independent_review_evidence`。
- 持久化复核、手动标记完成、缺口返工、全局任务子任务门禁都接入同一检查。

## 用户体验

- 普通小改动不额外卡住。
- 复杂变更缺复核时，任务不会被说成“已完成”，而是继续停留在验收/返工状态。
- 用户可见文本只说明“复杂变更还缺独立复核”； reviewer、verdict、证据明细保留在技术详情和交付摘要里。

## 第三方 Agent 兼容

第三方写代码 Agent 可以在回执里补充：

```json
{
  "ccm_receipt": true,
  "status": "done",
  "summary": "已完成后端 API 修改",
  "independentReview": [
    {
      "reviewer": "qa-agent",
      "verdict": "passed",
      "summary": "已复核目标覆盖、风险和验证证据。",
      "evidence": ["backend/server.ts", "npm run check passed by external runner (exit 0)"]
    }
  ]
}
```

## 自测覆盖

- `runCollaborationUxSelfTest()`：
  - `independentReviewGateBlocksComplexChange`
  - `independentReviewGatePassesWithEvidence`
  - `independentReviewGapDraftGuidesReviewer`
- `scripts/main-agent-decision-ui-selftest.mjs`：
  - `backendBuildsIndependentReviewGate`

