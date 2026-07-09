# Current Todo Post Turn Summary V1

## 背景

参考 `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts` 里的 `post_turn_summary`：

- `recent_action` 表示最近发生了什么。
- `needs_action` 表示接下来需要什么动作或等待什么条件。
- `status_category/status_detail` 让恢复会话时能快速知道当前状态。

本项目已有当前 Todo 和 activeForm，但执行中状态主要展示“正在做什么”。用户如果中途回来查看，还需要知道“刚完成了哪一步”和“现在等待/需要什么”，否则主 Agent 的工作链路仍然不够可恢复。

## 本次升级

- 群聊主 Agent 的 `current_todo_summary` 新增：
  - `recent_action/recentAction`
  - `needs_action/needsAction`
- 全局主 Agent 流式当前 Todo 同步新增同名字段。
- 群聊主 Agent 状态卡渲染 `最近：...` 和 `需要：...`。
- 全局主 Agent 流卡片渲染 `最近：...` 和 `需要：...`。
- 文案继续走用户可读过滤，技术细节不进入主展示区。

## 回归覆盖

- 群聊状态卡断言：
  - `最近：已派发给子 Agent`
  - `需要：等待子 Agent 提交结果说明，然后主 Agent 会验收并总结。`
- 全局待确认计划断言：
  - `最近：确认目标和影响范围`
  - `需要：等待你确认执行前计划`
- 全局自动执行计划断言：
  - `最近：确认目标和授权范围`
  - `需要：继续执行计划，并在完成后给出总结。`
- 后端自测增加 `groupStatusCurrentTodoPostTurnVisible`，确保真实派生状态携带这两个字段。

## 边界

- 本次不修改 TestAgent 业务逻辑。
- 普通问话仍不会显示 Todo。
- 完成后的 Todo 归档策略不变；本次只增强进行中/等待中状态的可读恢复信息。
