# 全局主 Agent 前端状态标签拆分

日期：2026-07-09

## 背景

全局主 Agent 的流式 Todo 和旧任务状态函数里，部分阻塞状态会显示为“需要处理/需处理”。这类状态很多时候只是主 Agent 自己还要补齐验证证据、等待执行成员结果或继续验收，不一定需要用户操作。

## 本次调整

- 将全局任务旧状态函数里的 `blocked` 文案从“需要处理”改为“待补齐”。
- 将流式 Todo 的状态标签拆成：
  - `blocked`：待补齐
  - `needs_user` / `waiting_user` / `waiting_clarification`：等待补充
  - `needs_confirmation` / `waiting_confirmation`：等待确认
  - `failed` / `error`：失败
- 增加真实渲染 fixture：当前 Todo 为 `blocked` 时，界面展示“待补齐”，并且不会把内部 `needs_action` 渲染成“需要：...”。
- 增加 Playwright 回归和源码自测守卫，防止后续又退回泛化“需处理”。

## 验收点

- 普通问话仍不展示 Todo。
- 全局流式 Todo 的内部下一步仍显示在“下一步”，不冒充用户待办。
- 阻塞但不需要用户动作的步骤显示为“待补齐”。
- 真正等待用户确认的步骤仍显示“等待确认”。
