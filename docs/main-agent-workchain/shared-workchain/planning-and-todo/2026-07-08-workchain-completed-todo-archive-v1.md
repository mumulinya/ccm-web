# Workchain Completed Todo Archive v1

## 背景

参考 `D:\claude-code\docs\tools\task-management.mdx` 中 TodoWrite 的行为：当 Todo 全部完成后，Claude Code 会清空当前 Todo 列表，避免用户主界面继续展示一排已完成步骤造成视觉噪音。

本项目此前已经能在任务进行中展示主 Agent Todo，也能在最终交付时展示总结；但 workchain fallback 仍缺一个明确的“完成后归档”信号。某些没有 `delivery_report`、但已有最终总览的卡片，仍可能把全完成 Todo 重新渲染到主视图。

## 本次升级

- `backend/agents/workchain.ts`
  - 当 workchain 处于终态、所有 Todo 步骤均完成、且已有验证/验收/独立复核证据时，写入 `display_policy.archive_completed_todo`。
  - 同时保留 `steps` 作为技术数据，并提供 `visible_steps: []`、`archived_steps_count`、`archive_summary`，让主视图安静归档，技术详情仍可追溯。
  - 如果缺少验证/验收证据，仍保留 `verification_reminder`，不会把质量缺口静默隐藏。

- `frontend/src/components/agents/MainAgentDecisionCard.vue`
  - 识别 `archive_completed_todo` / `archived_when_complete` / `visible_when_completed: false`。
  - 在没有验证提醒的前提下，隐藏全完成 Todo 的可见计划区域。

- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - workchain Todo fallback 尊重归档策略，避免终态 Todo 重新出现在任务主卡。

- `frontend/src/composables/useMainAgentDisplay.js`
  - 群聊主 Agent 顶部状态摘要不再为已归档 Todo 生成“计划 x/y”预览。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 新增 `case-workchain-completed-archived`：仅有 `completion_card` 的终态 workchain 卡片，用来验证归档策略本身，而不是依赖 `delivery_report` 的旧隐藏逻辑。

- `scripts/main-agent-render-regression.mjs`
  - Playwright 真实渲染断言：
    - 已归档 Todo 不显示 `.main-agent-decision-card` 和 `.decision-plan`。
    - 用户仍看到 `最终交付总览` 和友好的归档提示。
    - 技术详情默认折叠，Trace 不出现在用户主视图。

## 用户体验约束

- 普通问话仍不展示 Todo。
- 活跃任务仍展示 Todo、当前焦点和下一步。
- 已完成且有验收证据的 Todo 归档到技术详情，不干扰最终总结。
- 缺验收证据的 Todo 不归档，继续显示“还缺验收步骤”提醒。
