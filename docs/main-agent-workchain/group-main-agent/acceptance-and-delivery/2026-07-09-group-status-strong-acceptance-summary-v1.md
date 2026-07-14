# 群聊状态摘要强验收门禁 v1

## 背景

群聊任务卡已经收紧了“验收通过”的判断，但群聊顶部状态摘要和“进展怎么样”的状态追问仍可能优先读取任务表里的 `status=done`。如果旧任务只有裸 `acceptance_gate_passed=true`，状态摘要可能误显示为已完成。

## 改动

- 在 `group-routes.ts` 增加 `groupHasStrongAcceptanceEvidence` 和 `groupTaskDisplayStatus`。
- `buildGroupMainAgentStatus` 不再直接用 `latestTask.status` 判定终态。
- `buildGroupCompletionSummary` 和 `buildGroupPickupSummary` 在弱验收时不生成“交付完成/回来继续看这里”的完成卡。
- 状态追问会继续展示“验收中”和当前 Todo，提示补齐真实验证或复核证据。
- `runGroupStatusFollowupSelfTest` 增加弱验收回归用例。
- 静态守卫增加 `backendGroupStatusRequiresStrongAcceptance`。

## 用户可见效果

- 用户问“现在进展怎么样”时，弱验收任务不会被回答成“已完成”。
- 用户会看到任务仍在验收，下一步是补齐真实验证或复核证据。
- 交付总结、pickup summary 只在强验收通过后展示。

## 验证

本次新增自测覆盖：

- `status=done` 但缺少强证据时，群聊状态为 `reviewing`。
- 不生成 `completion_summary` 和 `pickup_summary`。
- 当前 Todo 保留在“最终验收执行成员结果”。
- 状态追问文本不包含误导性的完成交付总结。
