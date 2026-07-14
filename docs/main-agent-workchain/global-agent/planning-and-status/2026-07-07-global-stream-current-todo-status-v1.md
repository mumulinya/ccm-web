# Global Stream Current Todo Status v1

## 背景

全局主 Agent 已经能在流式消息里展示执行前计划、派发进度和任务卡，但用户在真实任务进行中仍需要一个更靠前的“当前正在做什么”提示。参考 Claude Code 的 Todo/TaskUpdate 体验后，本次补齐全局流式卡片顶部的当前步骤摘要，同时保持普通问话不显示 Todo。

## 改动

- 在 `frontend/src/components/global/GlobalAgent.vue` 增加 `buildGlobalStreamCurrentTodoSummary()`，从 `todo_plan`、`plan_mode` 或派发摘要推导当前步骤。
- 新增 `ccm-global-main-agent-current-todo-v1` 展示结构，包含当前步骤、状态、进度、下一步和显示策略。
- 在全局流式卡片头部下方渲染 `.global-stream-current-todo`，技术协议仍默认不进入用户可见文本。
- 补充移动端和暗色主题样式，避免当前步骤、状态和进度在窄屏挤压。
- 更新 Playwright 渲染回归：
  - 普通问话不显示当前 Todo。
  - 等待确认计划显示当前步骤。
  - 自动继续计划显示当前步骤。
  - 派发后显示跟踪执行、验收和最终总结。
- 更新 `scripts/main-agent-decision-ui-selftest.mjs` 的源码级守卫。

## 用户可见规则

- 普通问话：不展示 Todo/当前步骤。
- 执行前计划：展示当前待确认或执行中的计划步骤。
- 已派发任务：展示主 Agent 正在跟踪下游执行、验收和最终总结。
- 技术字段、内部协议、原始 payload 继续保留在技术详情链路中，不进入当前步骤摘要。

## 验收

- 静态自测需覆盖 `globalStreamCurrentTodoVisible`。
- 渲染回归需覆盖普通问话隐藏 Todo，以及真实任务显示当前步骤。
