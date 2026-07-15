# Todo 步骤证据追溯 + 一键处理 3.0

本轮目标：让群聊主 Agent 的 Todo 不只是显示状态，还能解释“为什么是这个状态”，并在异常步骤上提供可执行处理动作。

## 已完成

### 后端：每个 live Todo 步骤带证据

新增：

- `buildTodoStepEvidence()`
- `buildTodoStepActions()`

`buildLiveMainAgentTodoPlan()` 现在生成的每个 step 都包含：

```json
{
  "id": "coordinator_review",
  "content": "主 Agent 验收子 Agent 结果",
  "status": "reviewing",
  "evidence": [],
  "actions": []
}
```

### 证据类型

支持这些证据：

- `task`：任务 ID、任务状态、业务目标
- `trace`：Trace ID、派发/计划/冲突保护事件
- `agent`：子 Agent 当前状态
- `execution`：执行器状态
- `receipt`：子 Agent 回执
- `verification`：已执行验证
- `acceptance`：验收门禁
- `blocker`：失败原因、阻塞项、待补事项
- `files`：实际修改文件
- `report`：交付摘要

### 步骤级动作

异常步骤会生成上下文动作：

- `retry`：重新派发
- `gap_continue`：按缺口返工
- `switch_executor`：切换执行器
- `cancel`：取消任务
- `confirm_done`：标记已处理
- `view_pipeline`：查看协作看板/交付证据

这些动作不新造后端入口，而是复用任务卡已有 API：

- `/api/tasks/retry`
- `/api/tasks/continue-from-gaps`
- `/api/tasks/switch-executor`
- `/api/tasks/cancel`
- `/api/tasks/update`

其中 `confirm_done` 会走 `/api/tasks/update`，后端仍会执行已有验收校验，不会绕过安全门禁。

## 前端展示

`MainAgentDecisionCard.vue`：

- Todo 步骤下新增“证据与处理”折叠区。
- 用户展开后能看到这一步的证据。
- 如果这一步可处理，会显示按钮。
- 点击按钮通过 `step-action` 事件冒泡。

`TaskExperienceCard.vue`：

- 把 `MainAgentDecisionCard` 的 `step-action` 继续冒泡为任务卡 action。

`GroupChat.vue`：

- 直接决策卡也支持步骤动作。
- `handleTaskCardAction()` 支持 `action.task_id`。
- 新增 `confirm_done` 处理：用户确认后更新任务为 done，后端执行校验。

## 用户看到的效果

例如某一步是：

```text
主 Agent 验收子 Agent 结果 · 需确认
```

展开后可以看到：

- 子 Agent 回执摘要
- 失败验证
- 阻塞原因
- 修改文件
- 验收门禁

并能直接点：

- 按缺口返工
- 切换执行器
- 取消任务

## 自测

脚本：

```powershell
node scripts/main-agent-decision-ui-selftest.mjs
```

覆盖：

- 后端生成 Todo evidence/actions。
- live Todo 每步有证据。
- 失败/需确认步骤有可执行动作。
- 前端显示证据折叠区。
- 步骤按钮可冒泡到任务卡 action。
- 群聊直接决策卡也支持步骤动作。
- `confirm_done` 有前端 handler。

## 后续可增强

- 点击证据里的 Trace event 直接打开 Trace 详情。
- 文件证据点击后打开代码 Diff 抽屉。
- 回执证据点击后只展示对应子 Agent 的原始输出摘要。
