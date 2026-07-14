# 群聊主 Agent 当前 Todo 状态升级 v1

## 背景

Claude Code 的 Todo/TaskUpdate 链路会让用户持续看到当前正在推进的步骤，而不是只看到一次性的计划。项目里任务卡已经有 `live_todo_plan`，但群聊顶部 `主 Agent 状态` 主要展示最近进展和交付总结，用户在任务执行中还缺少一条稳定的“主 Agent 当前正在做什么”摘要。

## 本次升级

- 后端 `buildGroupMainAgentStatus()` 从最新任务卡的 `live_todo_plan` / `todo_plan` 推导 `current_todo_summary`。
- `current_todo_summary` 只保留用户可读字段：当前步骤、进行状态、进度计数、下一步；原始任务/runtime 数据不进入主视图。
- 终态任务不显示当前 Todo，避免完成后顶部挂旧步骤。
- 前端 `GroupMainAgentStatusCard` 新增“当前步骤”区块，显示进行中、待确认、验收、返工等状态。
- 真实截图回归新增 `04-group-main-current-todo.png`，覆盖顶部状态卡的当前 Todo 可见性。

## 用户可见效果

当群聊主 Agent 正在处理任务时，顶部状态卡会展示：

- 当前步骤：例如“子 Agent 正在执行”。
- 简短说明：例如“web 正在接入 owner 筛选 UI”。
- 状态与进度：例如“进行中 · 4/7”。
- 下一步：例如“等待子 Agent 提交结果说明，然后主 Agent 会验收并总结”。

普通问话不会生成任务卡，也不会显示当前 Todo。

## 验证项

- `scripts/main-agent-decision-ui-selftest.mjs` 增加 `groupRendersCurrentTodoSummary` 静态链路检查。
- `scripts/main-agent-render-regression.mjs` 增加主 Agent 当前 Todo 的 Playwright 可见性与截图断言。
- 后续完整验证需运行类型检查、后端构建、前端构建和两套渲染回归。
