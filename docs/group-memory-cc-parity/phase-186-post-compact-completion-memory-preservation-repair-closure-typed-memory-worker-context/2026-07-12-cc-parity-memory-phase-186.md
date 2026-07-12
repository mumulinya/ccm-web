# Phase 186: Preservation Repair Closure Typed Memory And WorkerContext Recall

Date: 2026-07-12

## Goal

Turn every strictly verified Phase 185 completion-memory compaction-preservation repair closure into durable, group-isolated typed MEMORY.md that can be recalled by every later child Agent session and survive another compact cycle.

The historical closure remains recovery evidence only. It is never current repository truth or current-session authority.

## Implemented

### Automatic closure distillation

When a Phase 185 repair item closes with:

- `completion_source=post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry`
- `resolutionReason=completion_memory_compaction_preservation_corrected_retry_verified`
- exact identity, current-session boundary, and historical-evidence proof flags

Memory Center automatically calls:

`distillPostCompactCompletionMemoryPreservationRepairClosureToTypedMemory`

The distillation is idempotent and scoped by group ID.

### Typed closure archive

New ledger archive:

`postCompactCompletionMemoryPreservationRepairClosureArchive`

New document:

`post-compact-completion-memory-preservation-repair-closures.md`

Each typed row keeps:

- repair work-item, assignment, binding and packet identity;
- failed retry/outcome/hook IDs;
- corrected retry/outcome/hook IDs;
- completion and required document paths;
- completion work-item and timeline IDs;
- historical task/native sessions;
- closure-time binding/task/native session;
- original preservation gaps;
- exact-identity, authority-boundary and historical-evidence proof flags;
- completion source and resolution reason.

The row is rejected unless failed and corrected retry/outcome IDs differ, exact identity is restored, current session is valid, and historical sessions are not current authority.

### Archive preservation

The new archive is included in `preservedGroupTypedMemoryDistillationArchives`.

This prevents normal long-log distillation during `buildAgentMemoryContextBundle` from overwriting the Phase 186 archive. This was found by the end-to-end fresh-session test and fixed at the ledger rewrite boundary.

### Fresh child-session recall

The existing post-compact receipt recall channel now includes Phase 186 closure rows and exposes:

- preservation repair work-item IDs;
- failed retry/outcome IDs;
- corrected retry/outcome IDs;
- restored completion docs/work items/timelines;
- all closure-time sessions as historical evidence.

Every invocation of `buildAgentMemoryContextBundle` creates a new current binding. The old closure session remains in historical evidence and cannot equal or replace the new task/native session.

### WorkerContext receipt contract

`runtime-kernel` now carries the closure document and failed/corrected identities into:

`ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1`

The rendered WorkerContext requires:

- every surfaced closure MEMORY.md appears in `CCM_AGENT_RECEIPT.memoryUsed` or `memoryIgnored`;
- used/verified requires `currentSourceVerified=true`;
- ignored requires an explicit reason;
- historical closure completion remains recovery evidence only;
- current repository state must be read again in the new child session.

### Subsequent compact preservation

The Phase 184 four-strategy test now includes the Phase 186 closure document and corrected outcome identity.

Verified across:

- memory-first compact;
- replay-brief partial compact;
- metadata partial compact;
- PTL deterministic downgrade.

Replay and metadata partial compact both recover dispatch; PTL recovers; the intentionally tiny memory-first case remains blocked while retaining a valid preservation proof.

### Quality checks

Registered:

- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure_typed_memory`
- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure_worker_context_recall`

## Verification

### Typed-memory self-test

`runGroupTypedMemoryPostCompactCompletionMemoryPreservationRepairClosureDistillationSelfTest`

Result: 7/7 passed.

It verifies exact identity, idempotence, typed document/index creation, recall, freshness/authority boundaries, and cross-group isolation.

### End-to-end Memory Center self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationRepairClosureTypedMemoryWorkerContextSelfTest`

Result: 8/8 passed across two groups and repeated fresh sessions.

It verifies typed-memory quality, group isolation, two distinct session bindings per group, WorkerContext contract propagation, historical-session separation, and rendered `memoryUsed`/`memoryIgnored` requirements.

### Phase 185 integration

The Phase 185 test now also proves that strict corrected-outcome closure automatically creates the Phase 186 archive and MEMORY.md.

Result: 10/10 passed.

### Regression

TypeScript:

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

Combined regression: 27/27 passed, covering Phases 176-186, read-plan repair, compact retry/outcome, provider repair/receipt, replay and metadata partial compact, PTL, ignore-memory, provider ranking and runtime usage.

## Invariants

- Typed rows and recall never cross group IDs.
- Historical repair completion is recovery evidence, not permanent repository truth.
- Every fresh child session receives a distinct current binding.
- Closure-time and older task/native sessions are historical evidence only.
- Used/verified recalled memory requires current-source verification; ignored memory requires a reason.
- Provider switch history remains ranking evidence only, never authorization.
- Explicit provider switches still require fresh valid receipt/checksum, local authority and task compatibility.
- Memory Center never creates a real child task.

## Next Audit

Phase 187 should audit actual `memoryUsed`/`memoryIgnored` receipts for the Phase 186 closure document. It should persist per-session use/ignore/current-source-verification feedback, repair noncompliant receipts through the existing main-Agent sidecar, and use repeated stale/ignored outcomes to lower recall priority without deleting the immutable closure audit history.
