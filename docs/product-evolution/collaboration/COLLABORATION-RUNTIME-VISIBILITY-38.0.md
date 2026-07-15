# 协作运行可视化与 contract injection 强消费门禁 38.0

## 目标

本轮补强协同工作闭环的三块可观测与门禁能力：

- Trace Replay 前端页面：从 UI 直接回放 `/api/orchestrator/trace-replay`，查看 lifecycle、blocked、ACK、contract injection 和最新事件。
- 任务卡 Runtime Kernel 展示：任务卡直接展示 runtime kernel、ACK-only、dispatch worker、WorkerContextPacket、injection_id 和上下文压力。
- contract injection 强门禁：依赖 Agent 只收到注入不算完成，消费者回执必须引用 `consumedInjectionIds` 才允许 daily_dev 完成。

## 后端协议

### Runtime Kernel 快照

`buildTaskCardView()` 现在输出：

- `runtime_kernel`
- `runtimeKernel`
- `technical.runtime_kernel`

快照来源优先级：

1. `delivery_summary.runtime_kernel`
2. `agent_coordination.runtime_kernel`
3. `buildRuntimeKernelSnapshot(task, summary)`

快照字段：

- `trace_id`
- `lifecycle_count`
- `latest_lifecycle`
- `blocked_count`
- `ack_only.active/count/latest`
- `dispatch_worker_count`
- `worker_context_packet_ids`
- `contract_injections`
- `injection_ids`
- `context_budget.max_pressure/compact_recommended`

### contract injection 消费门禁

`evaluateContractInjectionGate(rows, assignments, receipts)` 的完成条件变为：

- contractChanges 必须识别出消费者 Agent。
- 主 Agent 必须为消费者生成 contract injection 派发/续跑任务。
- 消费者 Agent 的结构化回执必须包含匹配的 `consumedInjectionIds`。

门禁状态：

- `not_required`
- `needs_injection`
- `needs_consumption`
- `injected`

未消费时：

- `pass=false`
- `unconsumed` 包含对应行
- task gap 增加 `contract_consume:<agent>:<injection_id>`
- 返工草稿要求复用原任务、原 Trace、同 Agent 会话，并补 `consumedInjectionIds`

## 前端

### Trace Replay

新增页面：

- `frontend/src/components/TraceReplay.vue`
- 菜单项：`trace-replay`
- 分组：协作管理

页面能力：

- 输入 `trace_id` 回放单条 Trace。
- 未输入时按 `limit` 读取最近 Trace replay suite。
- 展示总数、需复核、lifecycle、blocked、ACK、contract injection。
- 展示每条 Trace 的 verdict、事件计数和最新事件。

### 任务卡

`TaskExperienceCard.vue` 新增：

- runtime kernel 面板
- ACK-only 状态
- dispatch worker 计数
- WorkerContextPacket id
- injection id
- context pressure
- latest lifecycle

契约传递行新增：

- `injection_id`
- `needs_consumption` / `needs_consumption_receipt` 状态文案
- `consumed` 状态文案

## 自测覆盖

`runCollaborationUxSelfTest()` 新增断言：

- contract injection 已派发但消费者未引用 `consumedInjectionIds` 时，gate 为 `needs_consumption` 且不通过。
- 消费者回执包含匹配 `injection_id` 后 gate 通过。
- 任务卡暴露 `runtime_kernel.ack_only`、`injection_ids` 和 `technical.runtime_kernel.worker_context_packet_ids`。

## 验证记录

已通过：

```bash
npm run check
npm run build
npm run test:coordinator
node -e "const g=require('./ccm-package/dist/modules/group-orchestrator.js'); const r=g.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass}, null, 2)); process.exit(r.pass?0:1)"
```

构建产物已更新到 `ccm-package/dist` 与 `ccm-package/public/assets`。
