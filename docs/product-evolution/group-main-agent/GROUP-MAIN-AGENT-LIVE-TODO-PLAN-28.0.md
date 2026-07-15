# Todo / Plan 实时状态闭环 2.0

本轮目标：让群聊主 Agent 的 Todo / Plan 不再只是 `main_agent_decision` 的静态快照，而是跟真实任务生命周期一起变化。

## 已完成

### 后端 live Todo

新增：

- `buildLiveMainAgentTodoPlan()`
- `buildLiveMainAgentDecisionForTask()`

任务卡 `buildTaskCardView()` 现在会生成：

- `live_todo_plan`
- `mainAgentDecision`
- `main_agent_decision`
- `technical.mainAgentDecision`

这些字段来自真实任务状态，而不是前端猜测。

### 状态来源

live Todo 会读取：

- `task.status`
- `task.collaboration_state.phase`
- 任务执行器 `executions`
- 子 Agent / worker rows
- `delivery_summary.receipts`
- `delivery_summary.receipt_statuses`
- `delivery_summary.worker_notifications`
- `delivery_summary.acceptance_gate_passed`
- `delivery_summary.verification_executed`

### 状态映射

- 派发前：确认需求、读取群聊上下文、创建任务卡。
- 派发中：`dispatch_child_agent = in_progress / completed`
- 子 Agent 执行中：`child_agent_execution = in_progress`
- 子 Agent 回执后：`read_child_agent_receipts = completed`
- 主 Agent 验收中：`coordinator_review = reviewing`
- 返工：相关步骤进入 `reworking`
- 失败/缺口：相关步骤进入 `failed` 或 `needs_confirmation`
- 取消/撤销：后续步骤进入 `cancelled`
- 完成：交付报告步骤进入 `completed`

### 前端展示

`MainAgentDecisionCard.vue` 支持更多状态：

- `pending`：待执行
- `in_progress`：进行中
- `reviewing`：验收中
- `reworking`：返工中
- `completed`：已完成
- `skipped`：跳过
- `needs_confirmation`：需确认
- `failed`：失败
- `cancelled`：已取消

`GroupChat.vue` 的顶部“最近决策”现在优先读取任务卡里的 live `mainAgentDecision`，再回退到消息里的原始 `mainAgentDecision`。所以任务执行中，顶部计划摘要也会跟着刷新。

## 用户能看到什么

群聊顶部保持简洁：

```text
计划 4/7：主 Agent 验收子 Agent 结果
```

任务卡 / 决策卡里能看到完整计划：

```text
我正在这样处理
✓ 确认需求目标和涉及范围
✓ 读取群聊上下文和任务历史
✓ 创建可跟踪的项目任务卡
✓ 派发给 2 个子 Agent 或执行通道
◐ 子 Agent 正在执行
○ 等待子 Agent 回执
○ 等待验收完成后生成交付报告
```

内部 Trace、执行 ID、会话 ID 仍然在“技术详情”里折叠。

## 自测

脚本：

```powershell
node scripts/main-agent-decision-ui-selftest.mjs
```

覆盖：

- 后端生成 live Todo。
- 任务卡注入 live `mainAgentDecision`。
- completed / reviewing / reworking / failed / cancelled 状态被覆盖。
- 前端展示 reviewing / reworking / failed / cancelled。
- 群聊顶部优先读取任务卡 live 决策。

## 下一步可增强

- 每个 Todo 步骤绑定 Trace event ID，点击步骤展开对应证据。
- SSE 中专门推送 `todo_plan_updated`，让 UI 在不刷新任务卡时也能细粒度更新。
- 给验收失败的 Todo 增加“为什么失败”和“一键返工”按钮。
