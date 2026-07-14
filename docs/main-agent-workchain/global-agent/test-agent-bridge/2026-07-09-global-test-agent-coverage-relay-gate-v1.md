# 全局 TestAgent 覆盖率转发门禁 v1

日期：2026-07-09

## 目标

让全局主 Agent 在接收群聊/TestAgent 转发的复核结果时，也遵守和群聊主 Agent 一样的覆盖率门禁：不能因为 report 写了 `passed` 或 `accept`，就忽略 `requiredCheckCoverage` / `acceptanceCoverage` 里的 `unknown` 或 `not_verified`。

这对应 Claude Code 的 verification agent 思路：最终向用户汇报的主 Agent 必须拥有复核门禁，不能把缺证据的 PASS 当作完成。

## 改动

- `backend/modules/global/global-agent.ts`
  - 新增全局 TestAgent coverage 摘要 helper。
  - `compactGlobalTestAgentReviewRelayEvent(...)` 先检查 coverage 缺口，再决定 `passed`、`needs_rework` 或 `needs_user`。
  - `not_verified` 会转成“需返工”，并在可见摘要里展示必检项/验收条件缺口。
  - `unknown` 会转成“等你确认”，并让全局流式 UI checkpoint 进入等待态。
- 全局复核摘要最多展示 3 条待处理缺口，避免只展示第一条风险。
- 真实渲染回归新增全局 TestAgent coverage relay 场景：
  - `unknown` coverage 显示“需要你确认/等你确认”，技术详情默认折叠。
  - `not_verified` coverage 显示“失败/需返工”，并把必检项、验收条件缺口展示给用户。
  - 用户可见区域不泄露 `passed`、`accept`、schema、report 路径或 artifact manifest。

## 用户体验

- 用户可见区域只看到“独立复核需要人工确认”“我会先安排返工”等自然文案。
- `report.md`、`artifact-manifest.json`、本地 artifact 路径和原始 schema 仍保留在技术详情。
- 普通问答不受影响，只有 TestAgent/独立复核事件进入全局主 Agent 链路时触发。

## 验证

已运行并通过：

- `npm run check`
- `npm run build:backend`
- dist 专项自测：`runGlobalAgentIntentSelfTest()`，其中 `globalTestAgentUnknownCoverageRelayNeedsUser`、`globalTestAgentUnknownCoverageUiWaits`、`globalTestAgentNotVerifiedCoverageRelayNeedsRework`、`globalTestAgentNotVerifiedCoverageUiWaits` 均为 true
- dist 专项自测：`runCoordinatorReworkProtocolSelfTest()` coverage fallback 断言仍为 true
- `npm run test:chat-experience`
- `npm run test:render-regression`
  - 新增截图：`scratch/render-regression/07d-global-test-agent-coverage-relay.png`
- `npm run test:replay-regression`
- `npm run build:frontend`
- `git diff --check`
