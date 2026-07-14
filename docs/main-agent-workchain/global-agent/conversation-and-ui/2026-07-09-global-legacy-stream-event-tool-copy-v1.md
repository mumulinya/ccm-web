# 全局历史动作事件展示兼容 v1

日期：2026-07-09

## 背景

全局主 Agent 新生成的工具事件已经改成“执行动作 / 动作已返回”，但历史会话、回放 fixture 或旧版本存下来的 `streamEvents` 可能仍然带着“执行工具 / 工具完成 / 已完成，正在检查结果”。

这些旧字段如果被模板直接渲染，会让用户看到内部感更强、也容易误解成任务完成的文案。

## 改动

- `frontend/src/components/global/GlobalAgent.vue`
  - 新增 `visibleGlobalStreamEventTitle`，把旧标题“执行工具”“工具完成”“完成工具”映射成“执行动作”“动作已返回”。
  - 新增 `visibleGlobalStreamEventText`，把旧文本“已完成，正在检查结果”映射成“已返回结果，我正在检查”。
  - 全局流式事件模板不再直接渲染 `event.title` / `event.text`，统一走展示层清洗。
  - 历史事件生成动作摘要时也复用这套清洗，避免摘要里再出现旧词。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 增加一条旧格式历史事件 fixture：数据仍是“执行工具 / 工具完成”，用于验证页面展示兼容。

- `scripts/main-agent-render-regression.mjs`
  - 增加旧格式事件截图断言。
  - 断言用户能看到“执行动作”“动作已返回”“已返回结果，我正在检查”。
  - 断言用户看不到“执行工具”“工具完成”“已完成，正在检查结果”。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 加强 `globalAgentToolCompletionCopyFriendly` 静态守卫，要求真实组件模板和回归 fixture 都覆盖历史事件清洗。

## 用户可见效果

- 老会话和回放记录也会显示成“动作已返回，正在检查”，不会把底层工具返回误说成任务完成。
- 技术事件名和历史原始字段仍可保留在数据里，用户主视图只展示友好文案。
- 真正的“完成”仍然只用于最终交付总结、验收通过后的任务状态。

## 自测覆盖

- `globalAgentToolCompletionCopyFriendly`
  - 静态检查全局组件必须使用 `visibleGlobalStreamEventTitle` / `visibleGlobalStreamEventText`。
  - 静态检查渲染回归包含旧格式事件兼容断言。

- `main-agent-render-regression`
  - 截图覆盖旧格式全局动作事件。
  - 断言旧标题和旧结果文本不会出现在用户可见区域。
