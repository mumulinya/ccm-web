# 群聊执行成员状态回传文案 v1

日期：2026-07-09

## 背景

群聊状态回看会展示“执行成员等待情况”。这里的成员级 `done/completed` 只表示执行成员已经回传结果说明，不代表整项需求已经通过主 Agent 验收。

此前状态摘要会显示“已完成：web”或行标签“已完成”，容易和任务最终完成混淆。

## 改动

- `backend/modules/collaboration/group-routes.ts`
  - `groupChildAgentStatusLabel("completed")` 改为“已回传结果”。
  - 执行成员状态摘要从“已完成：成员”改为“已回传：成员”。
  - 状态回看自测补充断言：成员回传不能再显示为“已完成：web”。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 加强 `groupRendersChildAgentStatusSummary` 和 `backendGroupStatusFollowupShowsChildAgentWaitingState` 静态守卫。
  - 防止执行成员状态摘要重新把成员级回传说成“已完成”。

## 用户可见效果

- 用户在“执行成员等待情况”里看到“已回传：web”“已回传结果”。
- 用户能理解这是结果已到达，主 Agent 还要继续验收和总结。
- 最终“已完成”仍然留给任务交付总结使用。

## 自测覆盖

- `groupStatusFollowupShowsChildAgentWaitingState`
  - 状态回看必须包含“已回传：web”。
  - 状态回看不能包含“已完成：web”。

- `groupStatusDerivesChildAgentRows`
  - 从真实任务摘要推导出的执行成员行必须把 `web` 标为“已回传结果”。
  - 推导出的 summary text 必须使用“已回传：web”。
