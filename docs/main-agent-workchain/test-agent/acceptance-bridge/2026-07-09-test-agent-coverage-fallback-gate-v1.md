# TestAgent 覆盖率 fallback 强门禁 v1

日期：2026-07-09

## 目标

让群聊主 Agent 在连接 TestAgent 时，不依赖 TestAgent 一定产出 `verdict.json`。如果第三方 TestAgent 或另一个维护线程只返回 `ccm-test-agent-report-v1`，主 Agent 也会读取 `requiredCheckCoverage` 和 `acceptanceCoverage`，并按覆盖率缺口决定是否返工、暂停或继续验收。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 新增 TestAgent 报告 fallback 裁决：没有 `verdict.json` 时，用 TestAgent report 生成 `ccm-test-agent-verdict-v1`。
  - 增加强门禁：只要必检项或验收条件存在 `not_verified`，主 Agent 强制判定为需要返工；存在 `unknown`，强制判定为需要人工确认/补齐证据。
  - 过滤覆盖率缺口场景下的“可以接受”下一步，避免用户可见文案出现自相矛盾。
  - 新增自测样本：无 verdict 文件但 `acceptanceCoverage: unknown`、无 verdict 文件但覆盖率 `not_verified`。

## 用户体验

- 用户看到的是“需要返工”“需要人工确认”“补齐未覆盖的验证证据”等可理解结论。
- 原始 report/verdict schema、本地 artifact 路径和技术字段仍放在技术详情。
- 普通问答不受影响，只有 TestAgent 复核报告进入主 Agent 验收链路时才触发。

## 边界

本次只修改主 Agent 与 TestAgent 的连接、消费和展示判断，不修改 TestAgent 本体业务流程。TestAgent 如何生成更完整的报告仍由 TestAgent 维护线程负责。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- dist 专项自测：`runCoordinatorReworkProtocolSelfTest()`，其中无 verdict 的 `unknown`/`not_verified` coverage fallback 断言均为 true
- dist 自测：`runCollaborationUxSelfTest()`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `git diff --check`
