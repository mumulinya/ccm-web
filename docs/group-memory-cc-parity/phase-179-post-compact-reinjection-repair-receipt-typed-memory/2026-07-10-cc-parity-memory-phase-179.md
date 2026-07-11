# CCM Group Memory CC Parity - Phase 179

Date: 2026-07-10

## Goal

把 Phase 178 已验证的 post-compact reinjection repair completion 从短期 timeline/work-item ledger 蒸馏为 group-scoped typed MEMORY.md，使后续 compact、新子 Agent 会话和第三方 Agent 调用能够召回“该精确候选已完成修复”的历史证据。

本阶段不把历史完成回执当作永久新鲜的仓库事实。未来再次使用候选时，仍必须读取或校验 current source。

## Closed Gap

Phase 178 已具备严格关闭门禁：

- exact reinjection gate
- exact post-compact candidate
- exact task Agent session
- exact native provider session
- postCompactCandidateUsage used/verified/ignored
- matching memoryUsed/memoryIgnored
- currentSourceVerified or ignored reason
- complete dispatch-to-receipt timeline

此前这些事实只保存在执行 ledger 中。压缩后或新子 Agent 会话只能把它们当作临时审计记录，无法稳定通过 typed-memory recall 重用，也可能重复打开相同 repair。

Phase 179 新增稳定蒸馏层：

```text
valid child Agent receipt
  -> strict Phase 178 repair closure
  -> typed-memory distillation archive
  -> reference/feedback MEMORY.md
  -> MEMORY.md index and recall
  -> Memory Center quality gate
```

## Implementation

### Typed-Memory Distillation

File:

- `backend/modules/collaboration/group-memory-index.ts`

New API:

- `distillPostCompactReinjectionRepairReceiptConsumptionToTypedMemory`

New schema:

- `ccm-post-compact-reinjection-repair-receipt-consumption-distillation-v1`
- `ccm-post-compact-reinjection-repair-receipt-consumption-distilled-row-v1`

The archive preserves:

- timeline binding id
- dispatch brief id
- repair work item id
- task/project/assignment/dispatch identity
- reinjection gate id
- candidate id/kind/value/source message id
- used/verified/ignored usage state
- current-source verification
- memory receipt match
- task/native session match
- WorkerContextPacket/handoff/snapshot/execution identity
- task Agent session id
- native session id
- completion source
- resolution reason
- completion timestamp

Rows are deduplicated by exact repair, candidate, session and completion identity. Repeated distillation increments observation metadata without adding duplicate archive rows.

### Typed MEMORY.md Policy

Generated documents:

- `post-compact-reinjection-repair-receipt-memory.md`
  - type: `reference`
  - contains used/verified completion rows
- `post-compact-reinjection-repair-receipt-cautions.md`
  - type: `feedback`
  - contains ignored completion rows

Ignored candidates are never promoted into positive recovery memory.

Both documents state the stable freshness boundary:

```text
Historical repair completion is recovery evidence, not permanent repository truth.
Future use must reverify the current source.
```

### Automatic Closure Integration

File:

- `backend/modules/collaboration/group-orchestrator.ts`

Automatic distillation runs only after:

- the timeline binding has all five required events
- exact gate/candidate usage proof is valid
- task and native sessions match
- matching memoryUsed/memoryIgnored exists
- the repair work item actually closes

The automatic row records:

- `completion_source=post_compact_reinjection_replay_repair_receipt_consumption`
- `resolution_reason=post_compact_reinjection_repair_receipt_verified`

Memory Center diagnostics still do not create real child Agent tasks. Real dispatch remains owned by the group main Agent.

### Memory Center Quality Gate

File:

- `backend/modules/knowledge/memory-control-center.ts`

New quality check:

- `post_compact_reinjection_repair_receipt_typed_memory`

The report verifies:

- every checked valid completion exists in the typed archive
- exact gate/candidate/session/completion metadata exists in MEMORY.md
- used/verified rows use reference memory
- ignored rows use feedback memory
- typed memory can be recalled by an exact candidate/session probe
- the historical-evidence/current-source boundary is present

New self-tests:

- `runGroupTypedMemoryPostCompactReinjectionRepairReceiptConsumptionDistillationSelfTest`
- `runMemoryCenterPostCompactReinjectionRepairReceiptTypedMemorySelfTest`

## Multi-Group Isolation

The distillation ledger and generated documents remain scoped by `groupId` under the existing group typed-memory directory. Multiple group chats can hold different repair histories without sharing completion authority.

Cross-group history, if recalled by a later policy, remains evidence only. It cannot close a repair or authorize repository state without the current group's fresh source and session proof.

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Targeted Phase 179 checks:

- typed-memory distillation: passed
- repeat distillation idempotency: passed
- ignored completion remains feedback memory: passed
- automatic closure-to-memory distillation: passed
- exact gate/candidate/task-session/native-session persistence: passed
- recall probe: passed
- Memory Center typed-memory quality check: passed

Combined regression result: 20/20 passed.

Covered regressions include:

- Phase 176 read-plan revalidation repair dispatch
- Phase 177 post-compact reinjection repair dispatch
- Phase 178 strict receipt consumption and closure
- replay repair plan/work items/candidates
- post-compact candidate discipline
- reinjection proof
- native provider dispatch timeline and receipt consumption
- provider re-proof typed memory
- provider ranking receipt typed memory and WorkerContext recall
- runtime kernel and context usage
- compact outcome ledger
- ignore-memory policy

`git diff --check` reports only the repository's existing LF-to-CRLF warnings.

## Invariants

- Provider switch execution history is ranking evidence only, never authorization.
- Explicit provider switch still requires a fresh valid receipt/checksum, local authority and task compatibility.
- A historical reinjection repair completion does not prove the candidate is currently fresh.
- Future child Agent sessions must reverify current source before using a recovered candidate.
- Memory Center diagnostics never create real child Agent tasks.
- Group memory remains isolated by groupId.

## Next Audit Direction

Phase 180 should prove the new receipt typed memory is selected and rendered into a genuinely fresh child Agent WorkerContextPacket, then require memoryUsed/memoryIgnored feedback for that recalled document.

The next closure should also prevent duplicate repair reopening only when:

- exact historical identity matches
- the current source is freshly revalidated
- the new child session records its own usage receipt

This keeps historical completion useful without turning stale memory into current authority.
