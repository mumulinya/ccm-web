# 群聊 TestAgent 复核流式展示桥接 v1

日期：2026-07-09

## 目标

让群聊主 Agent 在 TestAgent 返回独立复核结果时，像全局主 Agent 一样即时把结果展示给用户。

之前群聊前端已经能展示 TestAgent 复核计划，但 `test_agent_review_ready` 复核结论主要依赖任务卡后续刷新；用户在流式处理中可能只看到“正在复核”，不能马上看到“需返工 / 等你确认 / 已通过”的用户可读结论。

## 改动

- `frontend/src/components/collaboration/GroupChat.vue`
  - 新增 `getTestAgentReviewPayload(...)`，从 SSE 事件里提取 `test_agent_review_summary`、`independent_review_summary` 和复核 rows。
  - 新增 `applyTestAgentReviewReady(...)`，把复核摘要合并到当前任务卡：
    - `independent_review_summary`
    - `test_agent_review_summary`
    - `independent_review`
    - `test_agent_report`
  - 群聊 SSE 分支新增 `test_agent_review_ready`，实时更新输入框上方的处理状态和任务卡复核区。
  - 用户可见内容通过 `sanitizeUserFacingStructure(...)` 清洗，schema、报告路径、artifact 信息仍留在技术详情。
- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加源码断言，防止群聊前端只处理 TestAgent 计划事件而漏掉复核结果事件。

## 用户体验

- 群聊里 TestAgent 复核完成后，用户能立即看到“独立复核”“需返工 / 等你确认 / 已通过”等摘要。
- 普通问答不受影响，不会额外展示 Todo 或复核卡。
- 技术内容继续默认折叠，不进入主文本框。

## 验证

已运行并通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `git diff --check`（仅有既有 LF/CRLF warning，无 whitespace error）
