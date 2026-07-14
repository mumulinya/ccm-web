# 全局状态摘要强验收门禁 v1

## 背景

群聊任务卡和群聊顶部状态已经收紧弱验收，但全局主 Agent 的“现在进展怎么样”状态追问仍会直接读取全局直派任务的 `status=done` 和 `acceptance_gate_passed=true`。旧摘要只有裸验收标记时，全局状态可能误显示“已完成/已通过验收”。

## 改动

- 在 `global-agent.ts` 增加 `globalTaskHasStrongAcceptanceEvidence` 和 `globalTaskDisplayStatus`。
- 全局状态追问中的子任务摘要、执行成员等待情况、进度刷新、全局直派任务行统一使用强验收口径。
- `reviewing` 显示为“验收中”，`reworking` 显示为“返工中”，减少用户理解成本。
- 弱验收直派任务不再展示 pickup summary 里的“旧摘要已完成”。
- 自测新增 `globalStatusWeakDirectDispatchStaysReviewing`。
- 静态守卫新增 `backendGlobalStatusRequiresStrongAcceptance`。

## 用户可见效果

- 用户问全局主 Agent“进展怎么样”时，弱验收直派任务会显示“验收中/等待任务卡验收”。
- 不会把只有裸 `acceptance_gate_passed=true` 的旧摘要说成“已完成”。
- 真实通过验证或复核后，才会展示“已完成/已通过验收”。

## 验证

本次新增自测覆盖：

- 强证据子任务仍显示为已完成。
- 弱验收直派任务显示为验收中。
- 弱验收直派任务不显示“已通过验收”。
- 弱验收直派任务不展示完成态 pickup summary。
