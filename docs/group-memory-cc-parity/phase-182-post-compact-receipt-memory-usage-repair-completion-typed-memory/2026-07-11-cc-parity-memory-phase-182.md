# CCM Group Memory CC Parity - Phase 182

Date: 2026-07-11

## Goal

把 Phase 181 严格关闭的 post-compact receipt-memory corrected-receipt completion 蒸馏为可索引、可召回、按群聊隔离的 typed MEMORY.md，并完整保留逐文档使用证据、原始会话证据、新 repair 会话身份和未来使用 freshness 边界。

## Closed Gap

Phase 181 已实现：

```text
bad child receipt
  -> idempotent repair work item
  -> main-Agent dispatch brief
  -> new repair task/native session
  -> five-event timeline
  -> corrected receipt verification
  -> strict completion
```

此前 completion 只存在于 replay-repair timeline 和 work-item ledger。后续 compact 或新子 Agent 会话不能稳定检索“该回执缺口已经被哪个新会话修复、修复覆盖了哪些 MEMORY.md、完成证据能否继续使用”。

Phase 182 新增：

```text
strict Phase 181 completion
  -> normalized per-document proof
  -> idempotent group typed-memory archive
  -> reference MEMORY.md
  -> typed-memory index
  -> recall probe
  -> future-session freshness and non-authorization boundary
```

## Stronger Completion Proof

File:

- `backend/modules/collaboration/group-orchestrator.ts`

The corrected-receipt proof now preserves:

- required MEMORY.md relPaths
- covered MEMORY.md relPaths
- per-document coverage rows
- `usageState=verified` or `usageState=ignored`
- `currentSourceVerified` result
- ignored-reason coverage and reason
- all-docs-compliant result
- historical-boundary result
- task/native session match results
- original task/native session ids
- repair task/native session ids
- original assignment and dispatch identity
- complete timeline event types

The timeline binding also retains original gap codes and per-document coverage rows through event merging.

## Typed-Memory Distillation

File:

- `backend/modules/collaboration/group-memory-index.ts`

New export:

- `distillPostCompactReceiptMemoryUsageRepairCompletionToTypedMemory`

New archive:

- `postCompactReceiptMemoryUsageRepairCompletionArchive`

New typed document:

- `post-compact-receipt-memory-usage-repair-completions.md`

Only rows satisfying every condition are accepted:

- exact Phase 181 repair source
- exact completion source and resolution reason
- verified corrected-receipt proof
- all required documents covered
- every document has a compliant usage row
- historical freshness boundary covered
- repair task/native sessions match the receipt
- repair sessions differ from original sessions
- all five timeline events exist
- exact work item, brief and timeline identities exist

The row id includes group, work item, brief, timeline, original packet, repair sessions, required docs and completion source. Repeated distillation updates the existing row instead of duplicating it.

## MEMORY.md Content

Each typed-memory row records:

- work item, brief and timeline ids
- completion source and resolution reason
- original packet, binding, assignment and dispatch ids
- original task/native session ids
- repair task/native session ids
- repair execution id
- required and covered MEMORY.md relPaths
- per-document usage state
- per-document current-source verification
- ignored-reason evidence
- original gap codes

The document states three stable boundaries:

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every future child Agent session must independently classify recalled memory in `memoryUsed` or `memoryIgnored`.
- Historical task/native session ids are evidence only and never authorize a future session.

## Automatic Distillation

File:

- `backend/modules/collaboration/group-orchestrator.ts`

After Phase 181 closes a repair work item, the timeline path automatically invokes typed-memory distillation only when:

- the work item was actually closed
- the source is the corrected receipt-memory repair source
- the full strict Phase 181 evidence gate passes

Invalid, incomplete or old-session receipts never reach the distillation path.

## Memory Center Quality Gate

File:

- `backend/modules/knowledge/memory-control-center.ts`

New check:

- `post_compact_reinjection_repair_receipt_memory_usage_repair_completion_typed_memory`

The check verifies:

- every completed Phase 181 item has an exact archive row
- exact original and repair session identities are preserved
- required documents and per-document proof are present
- reference MEMORY.md exists
- completion source and resolution reason are rendered
- typed-memory recall finds the document
- future-session freshness rule is present
- historical session non-authorization rule is present

New self-test:

- `runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionTypedMemorySelfTest`

## Multi-Group Isolation

The self-test creates two groups with distinct completion sentinels and verifies:

- each group has one independent archive row
- each group has its own typed MEMORY.md
- each recall query finds only its group's sentinel
- neither document contains the other group's evidence
- repeated distillation in one group does not affect the other group

All archive and document paths remain scoped by `groupId`.

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Phase 182 self-test: 7/7 checks passed.

Phase 181 integration self-test: 11/11 checks passed.

Combined regression: 31/31 passed.

Covered areas include:

- Phase 176-182
- compact read-plan revalidation
- post-compact discipline, usage scoring and typed-memory distillation
- reinjection proof
- partial compact policy and retry
- context usage repair and typed memory
- ignore-memory policy and receipt compliance
- provider ranking receipt, typed memory, recall and usage contract
- provider switch authorization boundary
- runtime kernel and context usage

`git diff --check` reports only existing LF-to-CRLF warnings.

## Invariants

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every future child session makes its own memory usage decision.
- Used or verified recalled memory requires current-source verification.
- Ignored recalled memory requires an explicit reason.
- Historical task/native sessions cannot authorize current or future work.
- Provider switch execution history is ranking evidence only, never authorization.
- Memory Center diagnostics never create real child Agent tasks.

## Next Audit Direction

Phase 183 should make `post-compact-receipt-memory-usage-repair-completions.md` enter relevant fresh child Agent WorkerContextPackets and require that new session to report its own `memoryUsed` or `memoryIgnored` decision.

The recall contract must remain task-relevant, repeatable across distinct child sessions, bound to the current task/native session, and reject any attempt to substitute the historical repair session as current authority.
