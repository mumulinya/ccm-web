# TestAgent 失败复核返工链路 v1

日期：2026-07-09

## 目标

让群聊主 Agent 和全局主 Agent 在接收到 TestAgent 的“未通过/需要返工”复核结论后，能够用用户能看懂的方式展示：

- 本轮不能直接验收完成。
- 哪些必检项或验收条件没有通过。
- 下一步会把失败检查项带回给原实现成员返工。
- 返工后会重新运行 TestAgent 复核。

技术字段、原始裁决文件、报告路径和本地证据路径仍只保留在技术详情里。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 为 TestAgent failed verdict 增加自测样本。
  - 验证主 Agent receipt 会转成 `failed`，独立复核 verdict 会转成 `failed`。
  - 可见输出增加“下一步”，展示返工和重新复核路径。
  - 将可见文案里的“原实现 Agent”收敛为“原实现成员”。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 新增群聊任务卡失败复核 fixture。
  - 新增全局流式卡片失败复核 fixture。
  - fixture 中保留 raw `needsRework`、`report_json`、`verdict.json`、artifact path 等技术字段，用于证明它们不会出现在用户可见区。

- `scripts/main-agent-render-regression.mjs`
  - 增加 Playwright 渲染断言：
    - 群聊任务卡显示“待返工/需返工”。
    - 全局流显示“需返工”。
    - 用户可见区不展示 raw verdict、report path、本地 artifact path。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态自测覆盖，确保后端自测、前端 fixture、渲染断言同时存在。

## 边界

本次只修改主 Agent 对 TestAgent 结论的消费、展示和回归验证，不修改 `backend/test-agent` 的业务流程。TestAgent 本体仍由另一个 Agent 负责。

## 验证

已运行并通过：

- `npm run check`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build:backend`
- `npm run build:frontend`
- dist 自测：`runCollaborationUxSelfTest()`、`runGlobalAgentLoopSelfTest()`、`runMainAgentWorkchainSelfTest()`
- 专项自测：`runCoordinatorReworkProtocolSelfTest()` 中 `nativeFailedTestAgentReceiptRequestsRework`、`nativeFailedTestAgentVisibleOutputShowsReworkPath`、`nativeFailedTestAgentVisibleOutputHidesRawVerdict` 均为 true
- `npm run test:render-regression`
- `npm run test:replay-regression`

新增真实渲染截图：

- `scratch/render-regression/02d-test-agent-failed-review-rework.png`
