# Phase 89 - Native Telemetry Dispatch/Session Binding

日期：2026-07-08

## 目标

继续把 CCM 群聊记忆系统推向 Claude Code 级别的记忆压缩与上下文使用能力。本阶段专门补齐 API microcompact native apply proof 的证据链：`native_request_adapter` telemetry 不能只证明“请求被构造过”，还要能绑定到真实的 task-agent session、memory context snapshot、execution/runner dispatch。

## 本次升级

- 扩展 `group-api-microcompact-native-apply-request-telemetry` ledger：
  - 新增 `runner_request_id` / `external_runner_request_id`。
  - telemetry entry id 哈希纳入 runner id，避免不同派发复用同一条证据。
- Memory Center proof report 新增绑定校验：
  - 校验 `task_agent_session_id` 是否存在于 `task-agent-sessions.json`。
  - 校验 task/group/project/native session 是否匹配。
  - 校验 `memory_context_snapshot_id/checksum` 是否能回查到该 task-agent session 的 snapshot ref。
  - 校验 `execution_id` 是否能加载到 execution record。
  - 当 telemetry 带 `runner_request_id` 时，必须能在 `execution.externalRunnerRequestIds` 中命中。
- 强证明升级：
  - `verified proof + fresh native_request_adapter telemetry` 之外，还必须 `session/snapshot bound + dispatch/execution bound`。
  - `agent_receipt`、stale telemetry、missing session、snapshot mismatch、runner mismatch 都只能算弱证据。
- Memory Center UI 增加可视化计数：
  - `session bound/mismatch`
  - `dispatch bound/unbound`
  - `runner bound/missing/mismatch`
  - 行级详情显示 `sessionStatus`、`dispatchStatus`、`runnerRequestId`。
- 子 Agent 上下文渲染规则更新：
  - 明确 `native_applied` 回执必须绑定 `taskAgentSessionId/nativeSessionId/memoryContextSnapshotId`。
  - 有 runner id 时必须能回查 execution 的 external runner request。

## 新增自测

- `runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest`
  - 完整绑定：session + snapshot + execution + runner 全部命中，强证明通过。
  - session 缺失：telemetry 合同匹配但 session/snapshot 无法回查，降级失败。
  - runner mismatch：session/snapshot 命中但 runner id 不在 execution record，降级失败。

## 验证

- `npm run build:backend`
- `runMemoryCenterApiMicrocompactNativeApplyProofSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest`
- `runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest`
- `npm run check`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build`
- build 后再次运行 proof / aging / dispatch binding / adapter telemetry 自测

## 结果

Phase 89 已完成。现在 Memory Center 的 API microcompact native apply 强证明从“请求遥测新鲜”升级为“请求遥测新鲜 + task-agent session/snapshot 可回查 + execution/runner dispatch 可回查”。这一步更接近 Claude Code 的记忆压缩使用闭环：群聊记忆不只是被压缩，也能证明它随子 Agent 会话被正确带入、请求被正确执行、回执不是空口声明。

## 后续方向

- 将 runner request id 从更多真实 child Agent dispatch 路径自动注入 native telemetry options，减少仅 execution-bound、runner-missing 的历史弱证据。
- 在 Memory Center 增加跨群聊视角的 dispatch binding 趋势，帮助发现某类 agent runtime 长期不落 runner 证据。
- 将绑定失败的 proof gap 自动转成 repair work item，交给主 Agent 后续修复或重放。
