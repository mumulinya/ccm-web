# Agent Runtime Kernel 37.0

日期：2026-07-05

## 目标

在已有主 Agent 协议、ACK gate、contractChanges 和任务卡能力之上，补齐更接近 Claude Code `QueryEngine / ToolExecution / AgentTool` 的运行时内核层：

- 全局主 Agent 和群聊主 Agent 统一写入 `agent_runtime.lifecycle`。
- 子 Agent 派发升级为可追踪的 `dispatch_worker` lifecycle。
- daily_dev 在 ACK 未通过前只派发 ACK-only 接单确认。
- Worker 工作单自动注入 `WorkerContextPacket`。
- `contractChanges` 注入依赖 Agent 时生成稳定 `injection_id`。
- 提供 Trace Replay、runtime kernel 自测、诊断检查和文档化验收。

## 本轮实现

### 1. 统一运行时内核

新增 `backend/agent-runtime-kernel.ts`：

- `recordAgentRuntimeLifecycle()`：记录 `scope/action/phase/risk/permission/context_budget/artifact_budget`。
- `evaluateAgentRuntimePermission()`：提供最小权限规则模型，支持 read 自动允许、高风险确认、群聊派发可审计。
- `buildContextBudget()`：估算上下文字符数、token、压力和压缩边界。
- `buildArtifactBudget()`：对大输出生成摘要预算和 hash。
- `buildTraceReplaySuite()` / `replayAgentTrace()`：从可靠性 Trace 回放 lifecycle、阻塞、工具/派发、ACK 和契约注入信号。
- `runAgentRuntimeKernelSelfTest()`：覆盖权限、上下文预算、Worker packet、contract injection 和 replay 结构。

### 2. 全局主 Agent lifecycle

`backend/global-agent-loop.ts` 在以下节点写入统一 lifecycle：

- 影子模式工具：`phase=shadow`
- 等待确认：`phase=permission`
- 工具执行前：`phase=pre_tool_use`
- 工具执行后：`phase=post_tool_use`
- 工具失败：`status=error`

这让全局主 Agent 的工具调用不再只散落在 `global_agent.tool_completed` 等事件里，而是能被统一 Trace Replay 和诊断中心读取。

### 3. 群聊主 Agent / 子 Agent 派发 lifecycle

`backend/modules/collaboration.ts` 在真实派发前写入：

- `scope=group`
- `action=dispatch_worker`
- `risk=agent`
- `target=目标子 Agent`
- `worker_context_packet`
- `execution_order`

直接项目任务也写入 `scope=worker / action=dispatch_worker`。

### 4. ACK 真正前置阻塞

daily_dev 任务如果要求代码变更或验证，并且 `delivery_summary.ack_gate_passed !== true`：

- `processCrossAgents()` 会把子 Agent 工作单改写为 **ACK-only 前置接单确认**。
- ACK-only 明确禁止实现、编辑文件、运行破坏性命令或宣称完成。
- 子 Agent 必须只返回 `CCM_AGENT_RECEIPT.receipt.ack`：
  - `understoodGoal`
  - `plannedScope`
  - `forbiddenScope`
  - `verificationPlan`
  - `unclear`
- 时间线新增 `ack_preflight_dispatch`。
- lifecycle 新增 `ack_preflight_dispatch`。

已有完成门禁仍保留：ACK 缺失/weak/needs_rewrite 会阻止 daily_dev 完成，并生成 ACK 重写返工。

### 5. WorkerContextPacket 自动注入

`backend/modules/group-orchestrator.ts` 的 coded 与 LLM 派发路径都会生成：

- 工作单正文里的 `WorkerContextPacket`
- 结构化 assignment 字段 `worker_context_packet`

packet 包含：

- `packet_id`
- `trace_id`
- `task_id`
- `project`
- `goal`
- `constraints`
- `document_findings`
- `dependencies`
- `contract_injections`
- `acceptance`
- `context_budget`

工作单中同时注入 ACK gate 要求，保证普通 CLI 子 Agent 即便只收到 prompt，也能按同一协议执行。

### 6. contractChanges 原生注入事件

contract injection 缺口续跑时会生成：

- `injection_id`
- `source_agent`
- `target_agent`
- `endpoint/type`
- `summary`
- `receipt_reference_required=true`

并写入 Trace：

- `type=agent_runtime.contract_injection`

返工说明要求依赖 Agent 回执引用对应 `injection_id`，避免普通“改 API 调用”被误判为已完成契约注入。

### 7. 新增 API

全局主 Agent：

- `GET /api/global-agent/runtime-kernel/self-test`
- `GET /api/global-agent/trace-replay?trace_id=...`
- `GET /api/global-agent/trace-replay?limit=20`

群聊主 Agent：

- `GET /api/orchestrator/runtime-kernel/self-test`
- `GET /api/orchestrator/trace-replay?trace_id=...`
- `GET /api/orchestrator/trace-replay?limit=20`

诊断：

- `/api/orchestrator/diagnostics` 新增 `agent-runtime-kernel` 检查。

## 自测覆盖

- runtime kernel 自测：
  - read 动作默认允许。
  - high risk 动作进入确认。
  - WorkerContextPacket 计算上下文预算。
  - WorkerContextPacket 文本包含 ACK gate。
  - contract injection 有稳定 ID。
  - Trace Replay suite 返回结构化结果。
- coordinator protocol 自测：
  - assignment 正文包含 `WorkerContextPacket` 和 `ACK gate`。
  - assignment 结构体包含 `worker_context_packet.packet_id`。
- 既有 6.3 自测继续覆盖：
  - ACK gate 失败阻止 daily_dev 完成。
  - ACK 缺失/weak 生成 ACK 重写返工说明。
  - `contractChanges.consumers` 生成依赖 Agent 注入缺口。
  - 明确 contract injection 续跑通过 gate。

## 验证命令

```bash
npm run check
npm run build
```

## 后续建议

1. 前端 `SystemDiagnostics` 可把 `agent-runtime-kernel` 展开成专门卡片。
2. 任务卡可展示 `WorkerContextPacket.packet_id`、`context_budget.pressure` 和最近 lifecycle。
3. Trace 页面可按 `agent_runtime.lifecycle`、`dispatch_worker`、`contract_injection` 过滤。
4. 权限规则可从当前内置规则扩展为持久化 UI：`ask once / always allow / deny / target-scoped allow`。
