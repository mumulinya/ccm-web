# Phase 108 - WorkerContextPacket Compact Hook Ledger

## Goal

把 WorkerContextPacket 的自动 compact/rerender retry 接入独立 pre/post hook ledger。

Phase 106 已经做到 memory-first compact retry，Phase 107 已经证明压缩后的 memory 重新注入最终 packet。本阶段补上 compact hook 的可审计性：每次子 Agent 派发前因为 context over-budget 触发自动 retry，都必须留下压缩前和压缩后的 sidecar 事件。

这让 CCM 更接近 Claude Code 风格的上下文治理：不是只看最终 packet 是否恢复，而是能追踪“为什么压缩、压缩前压力、压缩后状态、是否重新注入、是否可派发”。

## Sidecar

新增 sidecar 目录：

`~/.cc-connect/group-memory-worker-context-compact-hooks/`

ledger schema：

`ccm-worker-context-compact-hook-ledger-v1`

entry schema：

`ccm-worker-context-compact-hook-entry-v1`

每条 entry 记录：

- `hook_run_id`
- `phase`: `pre` 或 `post`
- `assignment_id`
- `dispatch_key`
- `project`
- `from_packet_id`
- `retry_packet_id`
- `method`
- `memory_first`
- `initial_usage_status`
- `final_usage_status`
- `dispatch_ready`
- `result_summary`
- `at`

## Runtime Semantics

当 `maybeRetryWorkerContextPacketCompactionForCoordinator` 进入自动 retry 时：

1. 生成 `compact_hook_run_id`。
2. 写入 `pre` hook：
   - 初始 packet id
   - 初始 usage status
   - total/max/free tokens
   - 是否有 memory
   - task 字符数
3. 执行 memory-first compact/rerender retry。
4. 如果 memory-first 恢复，写入 `post` hook：
   - retry packet id
   - final usage status
   - dispatch ready
   - memory reinjection status
   - omitted chars
5. 如果 memory-first 不足并进入 task fallback，最终 `post` hook 记录 fallback 结果。
6. 如果无法压缩，`post` hook 记录 blocked/no-compaction 状态。

`ccm-worker-context-compaction-retry-v1` 现在携带：

- `compact_hook_run_id`

assignment binding 现在携带：

- `worker_context_packet_compact_hook_run_id`

## Memory Center Coverage

新增质量检查：

- `worker_context_packet_compact_hook_ledger`

报告 schema：

- `ccm-worker-context-packet-compact-hook-ledger-report-v1`

主要指标：

- `retryBindingCount`
- `validHookBindingCount`
- `hookRunCount`
- `preHookCount`
- `postHookCount`
- `memoryFirstHookCount`
- `recoveredHookCount`
- `blockedHookCount`

Memory Center 会验证：

- 每个有 `worker_context_packet_compaction_retry` 的 assignment binding 都有 `compact_hook_run_id`。
- sidecar 中能找到同一 run id 的 pre/post entry。
- pre entry 必须证明初始状态是 `over_budget`。
- post entry 必须记录最终 usage status。
- recovered retry 的 post entry 必须 `dispatch_ready=true`。
- memory-first retry 的 hook entry 必须 `memory_first=true`。
- hook entry 必须绑定相同 `assignment_id`。

## Selftests

增强：

- `runWorkerContextMemoryFirstCompactionRetrySelfTest`
  - 增加 `compactHookLedgerRecordsPreAndPost`。
  - 验证真实 retry 流程生成 sidecar pre/post。
  - 验证 retry ledger 与 assignment binding 指向同一个 `compact_hook_run_id`。

新增：

- `runMemoryCenterWorkerContextPacketCompactHookLedgerSelfTest`
  - 构造 recovered memory-first retry binding。
  - 构造同 run id 的 pre/post hook sidecar。
  - 验证 Memory Center report 和 quality check 通过。

## Stable Memory

后续所有 WorkerContextPacket compact 行为都应遵循：

`over-budget gate -> pre hook -> compact/rerender -> memory reinjection proof -> post hook -> assignment binding -> Memory Center quality check`

这条链路是继续做 partial compact、PTL emergency fallback 和长期日志蒸馏的基础。没有 pre/post hook，就无法可靠判断一次压缩是可恢复治理动作，还是只是在派发前静默丢上下文。
