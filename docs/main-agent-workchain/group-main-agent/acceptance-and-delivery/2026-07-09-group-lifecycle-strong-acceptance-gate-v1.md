# 群聊任务生命周期强验收门禁 v1

## 背景

群聊主 Agent 和全局主 Agent 的用户可见区域需要避免“假完成”：旧数据里可能只有 `acceptance_gate_passed=true`，但没有真实验证、独立复核或验收明细。这样的任务不应该展示为已完成，也不应该同步“已通过验收”的最终总结回全局 Agent。

## 改动

- 新增后端强验收证据判断 `hasStrongTaskAcceptanceEvidence`。
- `deriveTaskLifecycle` 不再只凭 `status=done` 和裸验收布尔值进入 `completed`。
- 任务卡、执行过程、最终验收、计划核对、Todo 决策、动作按钮统一使用强验收结果。
- 弱验收任务会保留在 `reviewing/acceptance` 状态，并显示“最终验收缺少真实验证或复核证据”。
- 全局直派完成通知必须有强验收证据后才同步回全局 Agent 会话。
- 协作 UX 自测增加弱验收回归用例；静态守卫脚本增加防回退检查。

## 用户可见效果

- 普通用户不会看到内部协议字段。
- 只有真实验证、复核或验收证据充分时，文本框和任务卡才会显示“已完成/验收通过”。
- 证据不足时，用户会看到当前还在验收或补证据，而不是看到误导性的完成总结。

## 验证

本次新增的自测覆盖：

- 裸 `acceptance_gate_passed=true` 不能让生命周期进入 completed。
- 群聊任务卡不能显示 `delivery.acceptance_passed=true`。
- Todo 不能把最终交付报告标记为 completed。
- 全局直派任务不能把弱验收完成同步回全局 Agent 会话。
