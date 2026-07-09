# 全局监工状态可见刷新 v1

日期：2026-07-09

## 目标

让全局主 Agent 在持久监工阶段进入等待用户、返工、暂停或继续跟踪状态时，刷新用户可见的 workchain 和展示流，而不是只更新内部 `supervision_state`。

用户应该能看到：

- 这还不是完成结果。
- 当前是在等待用户处理阻塞，还是正在返工/重新复核。
- 下一步应该怎么继续。

技术 ID、任务 ID、监工 ID 和 trace 仍默认只放在技术详情里。

## 改动

- `backend/agents/global/loop.ts`
  - 新增 `globalSupervisionStateVisibleSummary(...)`。
  - `updateGlobalAgentSupervisionState(...)` 现在会同步刷新：
    - `final_reply`
    - `final_report`
    - `workchain`
    - `display_stream`
  - 监工进入 `waiting_user` 时，用户可见文案会说明“等你处理阻塞点”，并保留上下文。
  - 监工进入 `reworking` 时，用户可见文案会说明“正在返工、修复后重新复核”。
  - 新增全局自测覆盖等待用户和返工状态的可见刷新。

- `backend/agents/workchain.ts`
  - `supervising` 状态不再一律覆盖成固定“持续跟踪”文案。
  - 当 `phase=needs_confirmation` 或返工状态有明确文案时，优先显示具体状态。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态检查，确保监工状态刷新继续重建 workchain/display stream。

## 验证

已运行并通过：

- `npm run check`
- `npm run build:backend`
- dist 自测：`runGlobalAgentLoopSelfTest()`
- dist 自测：`runMainAgentWorkchainSelfTest()`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run test:render-regression`
- `npm run test:replay-regression`
