# 全局动作返回文案 v1

日期：2026-07-09

## 背景

全局主 Agent 的流式消息会展示工具调用进度。工具调用完成只表示某个底层动作已经返回结果，不代表用户需求已经完成。

此前全局流式卡片和动作摘要会显示“工具完成”“已完成 1 项动作”或“发送协作群指令已完成，正在检查结果”，容易让用户把工具级结果误解为任务级交付完成。

## 改动

- `backend/modules/global/global-agent.ts`
  - `tool_started` 用户可见标题从“执行工具”改为“执行动作”。
  - `tool_completed` 用户可见标题从“工具完成”改为“动作已返回”。
  - 结果文案从“已完成，正在检查结果”改为“已返回结果，我正在检查”。
  - 桌面状态提示也从“完成工具”改为“动作已返回”。

- `frontend/src/components/global/GlobalAgent.vue`
  - 全局流式事件渲染统一使用“执行动作 / 动作已返回”。
  - 动作摘要完成计数从“完成 N”改为“已返回 N”。
  - 摘要 headline 从“已完成 N 项动作”改为“已返回 N 项动作，正在检查结果”。
  - 最近动作从“已完成”改为“已返回，等待检查”。

- `frontend/visual-regression/main-agent-display-fixture.js`
  - 补充真实渲染 fixture 的动作返回事件。

- `scripts/main-agent-render-regression.mjs`
  - 截图断言覆盖“已返回 1 项动作，正在检查结果”。
  - 截图断言确认不会显示“工具完成”或“已完成 1 项动作”。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加 `globalAgentToolCompletionCopyFriendly` 静态守卫。

## 用户可见效果

- 用户看到的是“动作已返回，正在检查结果”，不会把工具调用结果误认为任务最终完成。
- 真正的“完成”仍然留给全局主 Agent 的最终交付总结、任务卡验收或全局任务报告。
- 技术事件名 `tool_completed` 仍保留在内部结构里，方便排障和回放。

## 自测覆盖

- `globalAgentToolCompletionCopyFriendly`
  - 检查后端和前端都使用“动作已返回”。
  - 检查动作摘要使用“已返回 N”。
  - 检查不再出现用户可见“工具完成”“完成工具”“已完成，正在检查结果”。

- `main-agent-render-regression`
  - 截图覆盖全局流式动作摘要。
  - 断言用户能看到“已返回 1 项动作，正在检查结果”。
  - 断言动作摘要中不显示“工具完成”和“已完成 1 项动作”。
