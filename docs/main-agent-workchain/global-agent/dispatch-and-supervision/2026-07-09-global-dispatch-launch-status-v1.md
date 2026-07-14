# 全局派发摘要状态口径 v1

日期：2026-07-09

## 背景

全局主 Agent 的派发摘要用于告诉用户“我已经把工作交给哪些执行目标”。这张卡片属于派发阶段，不等于最终交付。此前如果下游工具返回某个目标 `done/completed`，派发摘要可能把该行显示为“已完成”，用户容易误解为需求已经最终完成。

## 改动

- `backend/agents/global/loop.ts`
  - 新增 `normalizeGlobalDispatchLaunchRowStatus`。
  - 派发摘要里目标 `done/completed/success` 不再显示“已完成”。
  - 这类状态会显示为“已回传结果，待验收”，状态值归一到 `reviewing`。
  - 直接项目派发完成返回时也显示“已回传结果，待验收”，避免把工具完成当作需求完成。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态守卫，防止派发摘要重新使用“已完成”口径。

## 用户可见效果

- 全局主 Agent 派发后只展示派发/入队/待验收状态。
- 用户不会在派发卡里看到“已完成”并误以为需求已经交付。
- 最终完成仍以任务卡验收、验证证据和最终交付总结为准。

## 自测覆盖

- `globalDispatchLaunchSummaryDoesNotCallDoneTargetCompleted`
  - 构造下游目标返回 `status=done`。
  - 派发摘要必须显示“已回传结果，待验收”。
  - 派发摘要 JSON 中不能出现“已完成”。
