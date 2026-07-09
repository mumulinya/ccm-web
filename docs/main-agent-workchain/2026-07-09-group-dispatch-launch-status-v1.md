# 群聊派发摘要状态口径 v1

日期：2026-07-09

## 背景

群聊主 Agent 的派发摘要用于告诉用户“工作已经交给哪些执行成员”。这张卡片属于派发阶段，不应该把执行成员回传结果直接等同为需求最终完成。

此前如果执行成员状态为 `done/completed`，派发摘要会显示“已完成”。这会让用户误以为任务已经通过主 Agent 验收和总结，和当前“强验收后才算完成”的工作链路不一致。

## 改动

- `backend/modules/collaboration/collaboration.ts`
  - 新增 `normalizeGroupDispatchLaunchRowStatus`。
  - 派发摘要里 `done/completed/success` 统一显示为“已回传结果，待验收”。
  - 这类状态值归一到 `reviewing`，等待主 Agent 读取结果、验证证据和最终总结。
  - `running/in_progress`、`blocked/failed`、`queued/pending` 继续显示为执行中、需处理和已入队。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态守卫，防止群聊派发摘要重新把 `done/completed` 显示成“已完成”。

## 用户可见效果

- 用户在群聊主 Agent 派发卡里看到的是“已派发”“执行中”“已回传结果，待验收”等阶段状态。
- 用户不会因为执行成员回传了结果就误以为需求已经最终完成。
- 真正的“已完成”仍然来自主 Agent 验收通过后的交付总结。

## 自测覆盖

- `dispatchLaunchSummaryDoneTargetStaysReviewing`
  - 构造执行成员返回 `status=done` 的派发摘要。
  - 断言行状态为 `reviewing`。
  - 断言用户可见标签为“已回传结果，待验收”。
  - 断言派发摘要 JSON 不包含“已完成”。
