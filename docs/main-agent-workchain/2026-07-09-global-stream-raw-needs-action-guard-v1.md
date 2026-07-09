# 全局流 Todo 原始 needs_action 守门 v1

## 背景

全局主 Agent 的流式 Todo 会展示当前步骤、最近动作、需要用户处理的事项和下一步。此前已经避免把系统 `next_action` 误显示成“需要”，但如果上游直接传入 `needs_action`，前端仍会无条件展示到“需要：”区域。

这会让“等待执行成员提交结果说明，然后我会验收并总结”这类内部推进动作看起来像用户必须处理。

## 改动

- `GlobalAgent.vue` 中 `rawNeedsAction` 也必须通过 `globalTodoTextNeedsUserAction` 才会显示在“需要：”区域。
- 收紧用户动作识别规则：
  - 保留明确的确认、授权、回复、上传、填写、补充目标/范围/信息等用户动作。
  - 不再把泛化的内部补齐/等待执行成员动作当成用户待办。
- 视觉 fixture 给自动执行中的全局计划步骤补入一条内部 `needs_action`，用于回归。

## 回归

- Playwright 渲染断言新增：
  - `auto global current todo avoids raw internal needs action`
- `main-agent-decision-ui-selftest` 检查：
  - 前端代码对 `rawNeedsAction` 调用用户动作守门。
  - fixture 和渲染断言覆盖内部 `needs_action` 隐藏场景。

## 预期效果

全局主 Agent 流式文本框里，“需要：”只展示真正需要用户确认或补充的信息；主 Agent 自己继续等待、验收、总结的动作继续放在“下一步”或状态说明中。
