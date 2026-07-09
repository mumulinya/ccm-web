# 群聊 TestAgent 复核截图回归 v1

日期：2026-07-09

## 目标

给“群聊主 Agent 收到 TestAgent 复核结果后，把结论合并进当前任务卡”补真实渲染截图回归。

之前已有源码自检确认群聊 SSE 会处理 `test_agent_review_ready`，也已有任务卡最终态和全局流式 TestAgent 复核截图；这次补上群聊流式合并后的用户可见卡片，避免后续改前端时把复核结果展示丢掉。

## 改动

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 新增 `groupLiveTestAgentReviewMergedCard`。
  - 新增 `case-group-live-test-agent-review-merged` 真实渲染样本。
  - 样本包含 `test_agent_review_summary`、`independent_review_summary`、`independent_review` 和折叠的 `test_agent_report` 技术字段。
- `scripts/main-agent-render-regression.mjs`
  - 新增断言：复核计划仍显示，独立复核已通过，上传/下载/浏览器证据可见。
  - 新增断言：`verdict`、`passed`、`report_json`、artifact 路径不进入用户可见复核区。
  - 新增截图：`scratch/render-regression/02e-group-live-test-agent-review-merged.png`。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 更新截图数量守护为 22 张。
  - 增加新 fixture 和渲染断言的源码级守护。

## 用户体验

- 群聊任务执行中，TestAgent 复核返回后，用户能直接看到“独立复核已通过”和关键证据。
- 技术 report、artifact、路径、schema 仍默认折叠在技术详情中。
- 普通问话展示策略不变，不会因为这套回归额外出现 Todo 或复核卡。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- 人工查看截图：`scratch/render-regression/02e-group-live-test-agent-review-merged.png`
- `npm run check`
- `npm run build:frontend`
