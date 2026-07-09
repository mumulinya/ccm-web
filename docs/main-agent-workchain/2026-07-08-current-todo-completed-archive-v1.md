# Current Todo Completed Archive v1

## 背景

上一版已经让 `TaskExperienceCard` 中的 workchain Todo 在完成且有验收/复核证据后归档，避免用户在最终总结旁边继续看到一串已完成步骤。

继续对齐 Claude Code TodoWrite 的行为：Todo 全部完成后，主视图应清空当前 Todo，而不是在所有展示入口保留已完成列表。检查后发现还有两个入口需要同一套策略：

- 全局主 Agent 流式卡片的“当前步骤”
- 群聊主 Agent 顶部状态卡的“当前步骤”

## 本次升级

- `frontend/src/components/global/GlobalAgent.vue`
  - 新增 `shouldArchiveGlobalCompletedTodo`。
  - 全局流式 Todo 全部完成、且已有验证/验收/独立复核证据时，不再显示 `.global-stream-current-todo`。
  - 如果全部完成但缺少验证步骤/证据，会继续显示“还缺验收步骤”提醒，不会静默归档。

- `frontend/src/components/collaboration/GroupMainAgentStatusCard.vue`
  - 顶部“当前步骤”识别 `archive_completed_todo` / `visible_when_completed: false`。
  - 完成且已归档的当前 Todo 不再显示，用户主视图只保留交付总结、最近进展等更有用的信息。

- `backend/modules/collaboration/group-routes.ts`
  - 群聊当前 Todo 摘要生成时尊重归档策略。
  - 返回的 `display_policy` 明确携带完成归档语义，方便前端和历史数据统一处理。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 新增群聊顶部完成归档场景。
  - 新增全局流式完成归档场景 `global-completed-archived-todo-run`。

- `scripts/main-agent-render-regression.mjs`
  - Playwright 真实渲染断言：
    - 活跃 Todo 仍显示当前步骤。
    - 完成且有复核证据的 Todo 不显示当前步骤。
    - 用户仍能看到最终总结。

## 用户体验约束

- 普通问话不展示 Todo。
- 活跃任务继续展示当前步骤。
- 缺验证/验收证据时继续展示提醒。
- 完成且有证据的 Todo 归档，技术详情仍保留追溯信息。
