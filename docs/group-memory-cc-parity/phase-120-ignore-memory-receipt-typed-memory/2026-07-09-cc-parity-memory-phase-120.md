# Phase 120 - Ignore-Memory Receipt Typed Memory

Date: 2026-07-09

## Goal

Continue the long-running CCM memory parity goal by turning repeated ignore-memory receipt repair failures into typed `MEMORY.md` feedback memory. This lets future third-party child Agent sessions recall the exact receipt discipline even though each child Agent starts with a fresh session.

## Why This Matters

When a user asks a task to ignore memory, the WorkerContextPacket must treat platform, group, typed, and global memory as empty. The child Agent still needs to close the loop honestly:

- `CCM_AGENT_RECEIPT.memoryIgnored` must mention `user_requested_ignore_memory` or `must_not_use_group_memory`.
- `CCM_AGENT_RECEIPT.memoryUsed` must not claim historical platform memory was used.
- Repeated failures in this contract should become durable feedback memory, not just transient quality alerts.

This phase adds that durable feedback loop.

## Implementation

### Typed Memory Distillation

Added `distillIgnoreMemoryReceiptRepairToTypedMemory` in `backend/modules/collaboration/group-memory-index.ts`.

It collects ignore-memory receipt repair rows from repair work items, dispatch candidates, corrected worker briefs, and quality gaps, then writes:

- typed memory doc: `ignore-memory-receipt-discipline.md`
- type: `feedback`
- source: `auto:ignore-memory-receipt-repair-distillation`
- ledger archive: `ignoreMemoryReceiptRepairArchive`

The rendered memory explicitly preserves:

- `memoryIgnored`
- `memoryUsed`
- `user_requested_ignore_memory`
- `must_not_use_group_memory`

### Memory Center Quality Check

Added `worker_context_packet_ignore_memory_receipt_repair_typed_memory` in `backend/modules/knowledge/memory-control-center.ts`.

The check verifies:

- the repair dispatch chain has input rows,
- distillation writes a typed memory document,
- the distillation ledger archives rows,
- the typed memory body contains the receipt discipline,
- typed memory recall can find the discipline for future child Agent context.

The report now reads the current recall shape through `recall.recalled`, while keeping compatibility with older field names.

### Memory Center UI

Updated `frontend/src/components/knowledge/MemoryCenter.vue` so the ignore-memory panel exposes:

- typed memory quality check status,
- typed memory document count,
- recall hit count,
- typed-memory row details,
- targeted refresh for `worker_context_packet_ignore_memory_receipt_repair_typed_memory`.

### Build Blocker Cleanup

Fixed a current TypeScript blocker in `backend/test-agent/contract/schema.ts` by removing duplicate browser assertion schema keys. This was required to make `npm run build:backend` pass on the current dirty worktree.

## Validation

Passed:

- `npm run build:backend`
- `node -e "... runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest ..."`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist selftests passed:

- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest`

Key Phase 120 selftest result:

```json
{
  "pass": true,
  "report": {
    "status": "ok",
    "coverageRate": 100,
    "inputRowCount": 3,
    "archivedCount": 2,
    "typedMemoryDocCount": 1,
    "recallMatchCount": 1
  }
}
```

## Long-Term Goal Delta

This phase closes one important Claude Code parity gap: repeated memory discipline failures can now become durable typed feedback memory and be recalled in later child Agent sessions.

Remaining upgrade directions for future phases:

- apply the same failure-to-typed-memory loop to more WorkerContextPacket repair families, not only ignore-memory receipts;
- add stronger automatic promotion and decay policies for feedback memory;
- connect typed feedback recall more directly into child Agent prompt budgeting and ranking;
- add UI drill-down from typed memory rows back to the originating repair item, packet, candidate, and brief;
- continue auditing Claude Code memory behavior against CCM's multi-group and global-agent architecture.

## Status

Phase 120 is complete. The long-running CCM memory parity goal remains active.
