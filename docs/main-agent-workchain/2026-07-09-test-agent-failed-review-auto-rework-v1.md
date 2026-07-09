# TestAgent 失败复核自动返工 v1

日期：2026-07-09

## 目标

让群聊主 Agent 在 TestAgent 或独立复核给出“未通过/需要返工”后，不再只展示失败，也不再误当成“缺少复核”。主 Agent 应自动把失败点派回原实现成员，复用同一子 Agent 上下文继续修复；修复后再重新运行 TestAgent 复核。

这对应 Claude Code 链路里的关键约束：验证失败后先修复，再把发现和修复结果交回验证者复核，直到通过后才能向用户总结完成。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 独立复核证据保留 `reviewSubject`，主 Agent 能知道失败复核对应的原实现成员。
  - 新增失败复核返工 follow-up 生成逻辑：`test_agent_failed_review_rework` 会派回原实现成员，而不是再派给 TestAgent。
  - 主 Agent 验收循环接入该 follow-up；自动返工轮次用完后会进入需要用户确认，避免误报完成。
  - 返工路由明确保持 `continue_same_worker` / `same_worker_scratchpad`，让原实现成员带着上一轮上下文修。
  - 续跑草稿区分“缺少复核”和“复核未通过”：失败时提示原实现成员返工，并在修复后重新运行 TestAgent/独立复核。
  - 增加自测断言：失败复核会生成发给 `web-app` 的返工任务，不会生成新的 TestAgent handoff。

- `backend/modules/collaboration/agent-receipts.ts`
  - 格式化子 Agent 结果说明时保留 `reviewSubject`。
  - 让第三方写代码 Agent、TestAgent 或其他复核者返回的复核对象可以被主 Agent 后续解析和路由。

## 用户体验

- 用户可见层会看到“复核未通过，需要返工并重新复核”这类结果。
- 原始裁决、报告路径、artifact 路径、receipt 细节仍放在技术详情里。
- 普通问答不会触发 Todo 或返工卡；只有实际任务链路和复核失败才会显示这些进度。

## 边界

本次只修改主 Agent 对 TestAgent/独立复核结果的消费、返工路由和文档记录，不修改 `backend/test-agent` 内部业务流程。TestAgent 本体仍由另一条工作流负责。

## 验证

已运行并通过：

- `npm run check`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build:backend`
- `npm run build:frontend`
- dist 自测：`runCoordinatorReworkProtocolSelfTest()`
- dist 自测：`runCollaborationUxSelfTest()`
- `npm run test:render-regression`
- `npm run test:replay-regression`
