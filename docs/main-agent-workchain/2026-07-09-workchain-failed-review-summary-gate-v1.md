# 复核失败总结门禁 v1

日期：2026-07-09

## 目标

让群聊主 Agent 和全局主 Agent 的最终总结层区分两类情况：

- 缺少独立复核：需要补齐复核证据。
- 独立复核未通过：不能算完成，需要原实现成员返工后重新复核。

这样即使上层状态误传成 completed，用户可见总结也不会说“已完成”，而是明确展示还要返工和重新运行 TestAgent/独立复核。

## 改动

- `backend/agents/workchain.ts`
  - 新增独立复核 gate 状态归一化，识别 `failed_evidence`、`failed_count` 和 `status=failed`。
  - `completion_summary.independent_review` 会展示“复核未通过，需要原实现成员返工后重新复核”。
  - 最终总结质量门禁新增“独立复核”检查项，复核失败或缺失时不会通过。
  - 用户可见总结遇到复核失败时会写“这轮还不能算完成”，避免泛泛的“已完成”。
  - Todo/质量 follow-up 的下一步会提示：先让原实现成员修复，再重新运行 TestAgent/独立复核，再给最终总结。

## 用户体验

- 普通问答仍不会显示 Todo 或交付总结卡。
- 真实任务如果复核失败，主视图会继续展示待返工状态。
- 技术字段、原始报告路径、内部协议仍默认进入技术详情。

## 验证

已运行并通过：

- `npm run check`
- `npm run build:backend`
- dist 自测：`runMainAgentWorkchainSelfTest()`
- dist 自测：`runGlobalAgentLoopSelfTest()`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
