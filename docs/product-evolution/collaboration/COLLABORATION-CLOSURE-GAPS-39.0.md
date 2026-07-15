# 协同工作闭环缺口补强 39.0

## 目标

基于 37.0 runtime kernel 和 38.0 Trace/任务卡可视化，本轮补齐代码中已经暴露的协同闭环缺口：

- `contract_consume` 用户可读文案。
- 任务卡 ACK / 回执质量展示与后端硬门禁一致。
- Trace Replay 支持群聊主 Agent / 全局主 Agent scope、事件类型过滤、状态过滤和任务卡跳转。
- ACK-only 前置判定不再被普通工作单中的 ACK 关键词绕过。
- contract injection 消费从“引用 injection_id”升级为“引用 injection_id + contractConsumption 结论 + 必要证据”。
- SystemDiagnostics 增加 Runtime Kernel 专门卡片。

## 后端补强

### contractConsumption 质量门禁

`evaluateContractInjectionGate(rows, assignments, receipts)` 现在要求消费者回执同时满足：

- `consumedInjectionIds` 包含对应 `injection_id`。
- `contractConsumption` 包含同一个 `injection_id`。
- `contractConsumption.status` 必须是 `adapted` / `verified` / `no_change` / `not_required` 等通过状态。
- 如果声明 `adapted` / `verified`，必须提供文件、验证或 entry evidence。

否则行会保留在 `unconsumed`，`missing_reason` 为：

- `needs_consumption_receipt`
- `needs_consumption_evidence`

### ACK-only 前置判定

ACK-only 包装现在只跳过已经带有明确包装头的消息：

```text
【ACK-only 前置接单确认】
```

普通工作单里出现 `understoodGoal`、`接单 ACK` 等词，不再绕过 ACK 前置阻塞。

### 用户可读缺口

`contract_consume:<agent>:<injection_id>` 现在展示为：

```text
<Agent> 需要补充 contractChanges 消费回执
```

返工草稿会明确要求同任务、同 Trace、同 Agent 会话续跑，并补 `consumedInjectionIds` 与 `contractConsumption`。

## 前端补强

### Trace Replay

`TraceReplay.vue` 新增：

- scope：群聊主 Agent / 全局主 Agent。
- 事件类型过滤。
- 状态过滤。
- 支持任务卡 Trace 回放按钮跳转。
- 支持 URL：`?tab=trace-replay&trace_id=...&scope=global`。

任务卡技术详情中的 Trace 行新增“回放”按钮：

- 群聊任务默认打开 orchestrator trace replay。
- 全局任务默认打开 global trace replay。

### SystemDiagnostics

系统自检页新增 `Agent Runtime Kernel` 卡片，同时调用：

- `/api/orchestrator/runtime-kernel/self-test`
- `/api/global-agent/runtime-kernel/self-test`

展示群聊主 Agent 与全局主 Agent 的 runtime kernel 自测状态和关键检查项。

## 自测覆盖

`runCollaborationUxSelfTest()` 新增：

- 只有 `consumedInjectionIds`、没有 `contractConsumption` 时，contract injection gate 不通过。
- 有匹配 `injection_id`、消费结论、文件和验证证据时 gate 通过。
- 任务卡 runtime kernel 字段仍可见。

## 验证记录

已通过：

```bash
npm run check
npm run build
npm run test:coordinator
node -e "const g=require('./ccm-package/dist/modules/group-orchestrator.js'); const r=g.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass, collaborationUx:r.collaborationUx && r.collaborationUx.pass, runtimeKernel:r.runtimeKernel && r.runtimeKernel.pass}, null, 2)); process.exit(r.pass?0:1)"
```

构建产物已更新到 `ccm-package/dist` 与 `ccm-package/public/assets`。
