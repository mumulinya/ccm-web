# Phase 106 - WorkerContextPacket Memory-First Retry

## Goal

把 Phase 105 的 over-budget 自动 compact/rerender retry 从“任务文本优先压缩”升级为“记忆上下文优先压缩”。

这个阶段对应 Claude Code 方向的一个关键细节：子 Agent 的任务指令本身通常是最该保留的执行意图，真正膨胀的往往是群聊记忆、typed memory recall、global memory recall 和历史上下文。因此，当 WorkerContextPacket 超预算时，主 Agent 应先收缩记忆，再重新渲染 packet；只有记忆压缩仍不足时，才进入任务文本 head/tail fallback。

## Runtime Behavior

- `compactWorkerContextMemoryForRetry(memory, options)` 增加为 runtime-kernel 公共能力。
- 支持压缩：
  - `rendered_text` / `renderedText` / `summary`
  - `typed_memory_recall` / `typedMemoryRecall`
  - `global_memory` / `globalMemory`
  - `global_agent_memory_recall` / `globalAgentMemoryRecall`
  - nested `group_memory`
- 压缩摘要 schema：
  - `ccm-worker-context-memory-first-compaction-v1`
- retry ledger 继续使用：
  - `ccm-worker-context-compaction-retry-v1`
- 纯记忆恢复路径会记录：
  - `method: memory_first_deterministic_context_compaction`
  - `memory_first: true`
  - `memory_compaction`
  - `original_task_hash === compacted_task_hash`
  - `original_task_chars === compacted_task_chars`
- 如果记忆压缩后仍然超预算，再进入任务 fallback：
  - `method: memory_first_then_deterministic_head_tail_critical_lines`
  - `omitted_chars` 同时包含 memory 与 task 的省略字符数。

## Dispatch Semantics

- `autoWorkerContextCompactRetry=false` 时仍保留 Phase 104 的硬 hold 行为。
- over-budget 初始 packet 先触发 pre-dispatch gate。
- memory-first retry 恢复后：
  - `dispatchReady` 可恢复为 true。
  - `worker_context_pre_dispatch_gate.auto_retry_status` 为 `recovered`。
  - assignment binding 持久化 `worker_context_packet_compaction_retry`。
- memory-first retry 失败后：
  - 继续尝试任务压缩 fallback。
  - 如果仍 over-budget，则保持 hold，并走 Phase 103 repair work item 路径。

## Memory Center Coverage

Memory Center 的 `worker_context_packet_compaction_retry` 检查现在理解两类合法 retry：

- task compact retry：
  - 任务字符数必须下降。
- memory-first retry：
  - `memory_compaction.schema` 必须是 `ccm-worker-context-memory-first-compaction-v1`。
  - `memory_compaction.status` 必须是 `compacted`。
  - memory 字符数必须下降，且 `omitted_chars > 0`。
  - 纯 memory-first 恢复时允许任务字符数不变。

报告新增指标：

- `memoryFirstCount`
- `memoryOmittedChars`
- retry row 中的 `memory_first`
- retry row 中的 `memory_compaction_schema`
- retry row 中的 `memory_omitted_chars`

## Selftests

新增：

- `runWorkerContextMemoryFirstCompactionRetrySelfTest`
  - 构造巨大群聊记忆与短任务。
  - 初始 WorkerContextPacket over-budget。
  - memory-first retry 后恢复到预算内。
  - 断言任务文本未被压缩。
  - 断言 gate 恢复 dispatch ready。
  - 断言 binding 持久化 memory-first retry 证明。

- `runMemoryCenterWorkerContextPacketMemoryFirstCompactionRetrySelfTest`
  - 构造 memory-first retry binding。
  - 断言 Memory Center 接受纯记忆压缩恢复路径。
  - 断言 `memoryFirstCount` 与 `memoryOmittedChars` 被统计。
  - 断言任务字符数不变不会被误判为 gap。

回归覆盖：

- `runWorkerContextCompactionRetrySelfTest`
- `runWorkerContextPreDispatchGateSelfTest`
- `runMemoryCenterWorkerContextPacketCompactionRetrySelfTest`

## Stable Memory

后续升级 WorkerContextPacket 预算治理时，默认顺序应保持：

1. 先压缩可再生/可召回的记忆上下文。
2. 再压缩 replay/repair briefing 等可结构化恢复材料。
3. 最后才压缩用户任务或主 Agent 分派指令。

这条顺序是 CCM 记忆系统继续靠近 Claude Code 记忆压缩体验的核心约束：子 Agent 每次都是新会话，所以上下文必须可裁剪、可证明、可恢复，但任务意图不能被轻易牺牲。
