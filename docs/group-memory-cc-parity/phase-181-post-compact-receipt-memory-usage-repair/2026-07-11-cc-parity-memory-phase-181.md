# CCM Group Memory CC Parity - Phase 181

Date: 2026-07-11

## Goal

把 Phase 180 检出的 post-compact repair receipt MEMORY.md 使用回执缺口，转化为可派发、可验证、可严格关闭且不会重复打开的修复闭环。

## Closed Gap

Phase 180 已能证明新子 Agent 会话收到 repair receipt typed memory，并检查该会话是否正确提交 `memoryUsed` / `memoryIgnored`。此前不合规结果仍停留在诊断层，缺少：

- 幂等 repair work item
- 主 Agent dispatch candidate
- 自包含 corrected-receipt brief
- 新 repair task/native session 绑定
- 完整 timeline 关闭证据
- 对原始 receipt gap 的完成抑制

Phase 181 新增链路：

```text
noncompliant fresh child receipt
  -> idempotent repair work item
  -> main-Agent dispatch candidate
  -> corrected-receipt dispatch brief
  -> newly bound repair task/native session
  -> five-event dispatch timeline
  -> exact corrected receipt verification
  -> repair work item completion
  -> original gap satisfied without reopen
```

## Idempotent Work Items

File:

- `backend/modules/knowledge/memory-control-center.ts`

Repair source:

- `post_compact_reinjection_repair_receipt_memory_usage_receipt_repair`

The work-item identity preserves the affected group and original receipt evidence, including:

- WorkerContextPacket id
- binding, assignment and dispatch ids
- original task Agent session id
- original native session id
- required receipt MEMORY.md relPaths
- missing document relPaths
- missing `currentSourceVerified` relPaths
- missing ignored-reason relPaths
- normalized gap codes

Repeated quality scans upsert the same open work item instead of creating duplicates.

## Dispatch Candidate And Brief

Files:

- `backend/modules/knowledge/memory-control-center.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/agents/runtime-kernel.ts`

The candidate and brief preserve the full original evidence chain and required MEMORY.md list. The brief requires a corrected `CCM_AGENT_RECEIPT` containing:

- `replayRepairDispatchBriefUsage` bound to exact `brief_id` and `work_item_id`
- `memoryUsed` or `memoryIgnored` coverage for every required document
- `currentSourceVerified=true` for used or verified memory
- an explicit reason for ignored memory
- current repair `task_agent_session_id`
- current repair `native_session_id`
- the freshness boundary: historical repair completion is recovery evidence, not permanent repository truth

The brief usage contract is rendered before long repair details so compacting the brief cannot remove this required receipt field.

Memory Center only prepares diagnostics and dispatch material. It sets `should_create_real_task=false`; the group main Agent remains the only component allowed to dispatch a real child Agent task.

## Strict Receipt Closure

File:

- `backend/modules/collaboration/group-orchestrator.ts`

New proof validates:

- exact brief and work-item identity
- every required MEMORY.md document
- valid used/verified or ignored classification
- fresh current-source verification for used/verified rows
- ignored reason for ignored rows
- historical-evidence freshness boundary
- receipt binding to the new repair task/native session
- rejection of the original task/native session as repair authority

Closure requires all five timeline events:

- `dispatch`
- `child_agent_start`
- `worker_handoff_ready`
- `task_agent_memory_context_snapshot`
- `child_agent_receipt`

An invalid corrected receipt remains pending. A valid receipt from the newly bound repair session closes with:

- `completion_source=post_compact_reinjection_receipt_memory_usage_repair_receipt_consumption`
- `resolutionReason=post_compact_reinjection_receipt_memory_usage_corrected_receipt_verified`
- persisted `post_compact_receipt_memory_usage_repair_receipt` proof

The completed repair proof satisfies the matching Phase 180 gap and prevents an identical work item from reopening.

## Memory Center Quality Gates

New checks:

- `post_compact_reinjection_repair_receipt_memory_usage_repair_work_items`
- `post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_candidates`
- `post_compact_reinjection_repair_receipt_memory_usage_repair_dispatch_briefs`
- `post_compact_reinjection_repair_receipt_memory_usage_repair_receipt_consumption`

New self-test:

- `runMemoryCenterPostCompactReinjectionRepairReceiptMemoryUsageRepairSelfTest`

The test proves:

- one bad receipt creates one idempotent work item
- original evidence and required docs survive every planning layer
- planning does not create a real child task
- an old-session or incomplete receipt cannot close the item
- a valid new-session receipt closes only after the full timeline
- exact completion proof is persisted
- the original gap is satisfied without reopening

## Multi-Group Behavior

All work-item, candidate, brief, timeline and completion identities remain scoped by `groupId`.

Groups may have matching document names or candidate values without sharing:

- repair authority
- receipt compliance
- session binding
- work-item completion
- current-source verification

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Phase 181 self-test: 10/10 checks passed.

Combined regression: 27/27 passed.

Covered areas include:

- Phase 176-181
- compact read-plan revalidation
- post-compact candidate discipline and usage diagnostics
- reinjection proof
- partial compact policy and retry
- context usage repair and typed memory
- ignore-memory policy and receipt compliance
- provider ranking receipt consumption, typed memory, recall and usage contract
- provider switch decision receipt and ranking boundary
- runtime kernel and context usage

## Invariants

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every new child session makes its own memory usage decision.
- Used or verified recalled memory requires current-source verification.
- Ignored recalled memory requires an explicit reason.
- Historical task/native session ids cannot authorize the current repair.
- Provider switch execution history is ranking evidence only, never authorization.
- Memory Center diagnostics never create real child Agent tasks.

## Next Audit Direction

Phase 182 should distill the verified Phase 181 corrected-receipt completion into typed group memory and make that evidence available to future relevant child sessions.

The distilled memory must preserve the original gap identity, corrected receipt proof, repair-session identity and freshness boundary. Future recall must still require its own current-source verification and must not treat historical repair completion as permanent repository truth.
