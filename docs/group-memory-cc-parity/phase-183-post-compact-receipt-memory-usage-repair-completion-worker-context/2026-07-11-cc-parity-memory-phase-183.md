# CCM Group Memory CC Parity - Phase 183

Date: 2026-07-11

## Goal

让 Phase 182 的 `post-compact-receipt-memory-usage-repair-completions.md` 稳定进入相关的新项目子 Agent 会话，并要求每个新会话独立提交 `memoryUsed` 或 `memoryIgnored`，同时禁止历史 original/repair session 充当当前会话授权。

## Closed Gap

Phase 182 已生成可索引的 corrected-receipt completion typed memory，但此前只能证明文档可被普通 recall probe 找到，不能证明：

- completion-only archive 能激活专用 WorkerContext recall
- 第一个新会话构建 bundle 时不会丢失 archive
- 多个新会话能重复接收同一 completion memory
- WorkerContextPacket 会把文档列为 required memory receipt doc
- handoff 会要求当前会话独立回执
- assignment ledger 会保存合同和真实回执
- 历史 original/repair session 无法冒充当前会话

Phase 183 新增完整链路：

```text
Phase 182 completion archive
  -> archive-safe group-log distillation
  -> task-relevant repeatable recall
  -> typed-memory required load plan
  -> fresh session binding A/B
  -> WorkerContextPacket usage contract
  -> self-contained worker handoff
  -> assignment contract persistence
  -> real child receipt attachment
  -> memoryUsed/memoryIgnored compliance validation
```

## Archive Preservation Fix

File:

- `backend/modules/collaboration/group-memory-index.ts`

The generic group-log distiller preserves selected typed-memory archives while updating long-term transcript facts. The new Phase 182 archive was not in that preservation set.

Before this fix, bundle construction could temporarily remove `postCompactReceiptMemoryUsageRepairCompletionArchive` before dedicated recall ran. A later write restored the archive, so the MEMORY.md remained visible while the current WorkerContext contract stayed inactive.

Phase 183 adds the archive to `preservedGroupTypedMemoryDistillationArchives`. Completion memory is now available during the first bundle construction, not only after a later write-back.

## Completion-Aware Recall

File:

- `backend/modules/collaboration/memory.ts`

The existing post-compact repair receipt recall now supports both:

- exact reinjection candidate repair receipt memory
- corrected receipt-memory usage repair completion memory

Completion memory can activate recall independently, even when no Phase 179 reinjection archive is present.

Task relevance uses:

- corrected-receipt and receipt-memory usage intent
- work item ids
- brief ids
- timeline binding ids
- original WorkerContextPacket ids
- required MEMORY.md relPaths

The completion document is repeatable across distinct new child sessions and enters:

- typed-memory recall query
- required recall paths
- target paths
- typed-memory load plan
- rendered group memory context

New recall metadata preserves:

- completion work item ids
- completion timeline binding ids
- original WorkerContextPacket ids
- original task/native session ids
- repair task/native session ids
- completion archive rows and per-document proof

## WorkerContextPacket Contract

File:

- `backend/agents/runtime-kernel.ts`

The post-compact receipt-memory usage contract now includes:

- `corrected_receipt_completion_memory_active`
- `corrected_receipt_completion_doc_rel_paths`
- `corrected_receipt_completion_work_item_ids`
- `corrected_receipt_completion_timeline_binding_ids`
- original and repair historical session ids
- current session binding id
- current task Agent session id
- current native session id

New acceptance fields:

- `post_compact_receipt_memory_usage_repair_completion_memory_usage_required=true`
- `post_compact_receipt_memory_usage_repair_completion_current_session_binding_required=true`
- `post_compact_receipt_memory_usage_repair_completion_required_doc_rel_paths`

The existing generic receipt validator continues to enforce every surfaced document:

- used or verified requires `currentSourceVerified=true`
- ignored requires an explicit reason
- the historical recovery-evidence boundary must be stated
- receipt task/native session must match the current WorkerContextPacket session

## Handoff And Assignment

Files:

- `backend/agents/worker-handoff.ts`
- `backend/modules/collaboration/group-orchestrator.ts`

The self-contained worker handoff explicitly states:

- completion MEMORY.md must appear in `memoryUsed` or `memoryIgnored`
- historical original/repair sessions are evidence only
- historical sessions cannot replace the current task/native session
- the new decision must be bound to the current child Agent session

The existing assignment binding path persists the expanded contract and attaches the real child receipt by packet, assignment, dispatch and session identity.

## Memory Center Quality Gate

File:

- `backend/modules/knowledge/memory-control-center.ts`

New check:

- `post_compact_reinjection_repair_receipt_memory_usage_repair_completion_worker_context_usage`

New self-test:

- `runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionWorkerContextSelfTest`

The check proves:

- completion-only archives activate recall
- two distinct fresh sessions both receive the memory
- recall-ledger surfacing does not suppress the second session
- completion MEMORY.md enters the load plan and rendered packet
- work-item and timeline identities enter the contract
- original and repair sessions remain historical evidence
- current session ids do not leak into historical ids
- good used and ignored receipts pass
- stale used receipts fail
- historical-session receipts fail
- handoff, assignment binding and real receipt persistence remain complete

## Multi-Group Isolation

The self-test creates two groups with distinct completion work items and verifies:

- each group recalls its own work item
- neither group receives the other group's completion identity
- each group independently creates two fresh session bindings
- both groups pass the same receipt and historical-session boundaries

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Phase 183 self-test: 9/9 checks passed.

Combined regression: 32/32 passed.

Covered areas include:

- Phase 176-183
- compact read-plan revalidation
- post-compact usage scoring and typed-memory distillation
- reinjection proof
- partial compact policy and retry
- context usage repair and typed memory
- ignore-memory policy and receipt compliance
- provider ranking receipt, typed memory, recall and usage contract
- provider switch authorization boundary
- runtime kernel and context usage

`git diff --check` reports only an existing LF-to-CRLF warning for `runtime-kernel.ts`.

## Invariants

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every new child session makes its own memory usage decision.
- Used or verified recalled memory requires current-source verification.
- Ignored recalled memory requires an explicit reason.
- Historical original and repair sessions cannot authorize current work.
- Provider switch execution history is ranking evidence only, never authorization.
- Memory Center diagnostics never create real child Agent tasks.

## Next Audit Direction

Phase 184 should verify and repair completion-memory contract preservation across WorkerContextPacket memory-first retry, metadata partial compact, PTL emergency downgrade and post-compact reinjection.

The required completion doc, work-item/timeline identities, current session binding, historical sessions and receipt rules must survive every compact/retry path without promoting historical sessions into current authority.
