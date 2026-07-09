# Phase 107 - WorkerContextPacket Memory Reinjection Proof

## Goal

在 Phase 106 的 memory-first compact/rerender retry 之后，补上“压缩后的记忆确实重新注入最终 WorkerContextPacket 并出现在子 Agent 可见上下文里”的证明。

这一步解决一个 Claude Code parity 方向的细节：仅有 retry ledger 说明 memory 被压缩还不够，群聊主 Agent 必须能证明每次新开的第三方子 Agent 会话拿到的是最终压缩后的群聊记忆，而不是旧的大块 memory 或只存在于内部摘要里的 memory。

## Runtime Changes

- 新增 `buildWorkerContextMemoryReinjectionProof(packet)`。
- `refreshWorkerContextPacketUsage(packet)` 每次都会重算：
  - `memory_reinjection_proof`
  - `context_usage`
  - `context_budget`
- proof schema：
  - `ccm-worker-context-memory-reinjection-proof-v1`
- proof 记录：
  - `packet_memory_hash`
  - `rendered_memory_hash`
  - `packet_memory_chars`
  - `rendered_memory_chars`
  - `memory_first`
  - `compaction_retry_id`
  - `memory_compaction_schema`
  - `expected_compacted_memory_hash`
  - `hash_matches_compaction`
  - `status`

memory-first retry 恢复时，最终状态应为：

- `status: compacted_reinjected`
- `memory_first: true`
- `hash_matches_compaction: true`
- `packet_memory_hash === retry.memory_compaction.compacted_memory_hash`

普通 memory 注入时，状态为：

- `status: injected`

无 memory 的 packet 也会得到显式证明：

- `status: no_memory`

## Rendered Context

`renderWorkerContextPacket(packet)` 现在会渲染：

- `Memory reinjection proof`
- memory hash
- rendered memory hash
- memory-first compaction schema
- hash match 状态

这让子 Agent 实际收到的文本里包含可引用的记忆重注入证明，而不只是内部 JSON 字段。

## Assignment Binding

`recordWorkerContextPacketAssignmentBindingForCoordinator` 现在持久化：

- `worker_context_packet_memory_reinjection_proof`

并在 `worker_context_packet_render_probe.rendered_flags` 里记录：

- `has_platform_memory`
- `has_memory_reinjection_proof`
- `has_memory_compaction_hash`
- `has_memory_context_compact_marker`

这把链路闭合为：

1. memory-first retry compact 产生 `compacted_memory_hash`。
2. 最终 WorkerContextPacket 的 memory proof 产生 `packet_memory_hash`。
3. 两个 hash 匹配。
4. 渲染文本里出现 proof 与 memory hash。
5. assignment binding 持久化这份证据。

## Memory Center Coverage

新增质量检查：

- `worker_context_packet_memory_reinjection_proof`

报告 schema：

- `ccm-worker-context-packet-memory-reinjection-proof-report-v1`

主要指标：

- `reinjectionBindingCount`
- `validReinjectionCount`
- `memoryFirstCount`
- `compactedReinjectionCount`
- `hashMatchCount`
- `renderedProofCount`
- `renderedMemoryCount`

Memory Center 会验证：

- proof schema 正确。
- proof 与 assignment packet id 匹配。
- memory 存在并已渲染。
- memory hash 和 rendered hash 存在。
- memory-first retry 时 proof hash 必须匹配 retry 的 `compacted_memory_hash`。
- render probe 必须证明 `Memory reinjection proof` 和平台记忆出现在最终上下文里。

`memory_reinjection_proof` 和 `context_compaction_retry` 也被排除在自动裁剪建议外，避免主 Agent 把必需证明材料当作可删内容。

## Selftests

新增/增强：

- `runWorkerContextMemoryFirstCompactionRetrySelfTest`
  - 增加 `memoryProofReinjectedCompactedMemory`
  - 增加 `bindingRenderProbeShowsMemoryProof`

- `runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest`
  - 验证 retry hash、proof hash、render flags 三者一致。
  - 验证 Memory Center 定向 quality check 可通过。

- `runAgentRuntimeKernelSelfTest`
  - 验证普通 memory packet 也会带 `memory_reinjection_proof` 并渲染。

- `runWorkerContextUsageSelfTest`
  - 验证 context usage 分类包含 `memory_reinjection_proof`。

## Stable Memory

后续任何 WorkerContextPacket 记忆压缩能力都应保持这条证据链：

`memory compact summary -> final packet memory hash -> rendered proof -> assignment binding -> Memory Center quality check`

这比单纯“压缩成功”更接近 Claude Code 的上下文使用方向：每次子 Agent 都是新会话，因此必须证明最终下发上下文里确实包含可恢复、可追踪、可引用的群聊记忆。
