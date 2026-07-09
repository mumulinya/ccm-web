# Phase 121 - Context Usage Repair Typed Memory

Date: 2026-07-09

## Goal

Continue the long-running CCM memory parity goal by turning repeated WorkerContextPacket context pressure repairs into durable typed `MEMORY.md` feedback memory.

This extends the Phase 120 pattern from ignore-memory receipt discipline to context usage pressure discipline.

## Why This Matters

Project child Agents start fresh third-party sessions. If a WorkerContextPacket becomes too large, the group main Agent must compact or crop the packet before dispatch, while still preserving the parts a child Agent needs to work safely.

The repair experience must become future context:

- `context_usage.status` should recover to `warn` or better before dispatch.
- `free_tokens` must cover `autocompact_buffer_tokens`.
- the rendered child-Agent prompt must still show `Context usage budget`.
- `task_goal`, `verification_and_acceptance`, required proof IDs, receipt IDs, request/session/runner IDs must stay visible.
- large `group_memory_rendered`, duplicate `typed_memory_recall`, irrelevant `global_memory`, and verbose `replay_repair_dispatch_briefs` are the first pressure categories to compact.

## Implementation

### Typed Memory Distillation

Added `distillContextUsageRepairToTypedMemory` in `backend/modules/collaboration/group-memory-index.ts`.

It collects rows from:

- `worker_context_packet_context_usage_repair` work items,
- pressure packet summaries,
- Memory Center quality gaps.

It writes:

- typed memory doc: `worker-context-usage-pressure-discipline.md`
- type: `feedback`
- source: `auto:context-usage-repair-distillation`
- distillation ledger archive: `contextUsageRepairArchive`

The generated document records hot pressure categories and the compact/crop discipline for future child Agent sessions.

### Memory Center Quality Check

Added `worker_context_packet_context_usage_repair_typed_memory` in `backend/modules/knowledge/memory-control-center.ts`.

The check verifies:

- context pressure repair rows exist,
- rows are archived into `contextUsageRepairArchive`,
- the typed memory document is written,
- the document contains `context_usage.status`, `free_tokens`, `autocompact_buffer`, and `Context usage budget`,
- typed memory recall can find the pressure discipline.

### Selftest

Added `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`.

The selftest seeds an over-budget WorkerContextPacket, generates a repair item, distills it to typed memory, runs the quality check, verifies the distillation ledger, and confirms recall hits the new feedback memory.

## Validation

Passed:

- `npm run build:backend`
- `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- related dist selftests:
  - `runMemoryCenterWorkerContextPacketContextUsageSelfTest`
  - `runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest`
  - `runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest`
  - `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairTypedMemorySelfTest`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`
- final post-build dist selftest replay for the new check and adjacent WorkerContextPacket checks

Key selftest result:

```json
{
  "pass": true,
  "report": {
    "status": "ok",
    "coverageRate": 100,
    "inputRowCount": 2,
    "repairItemCount": 1,
    "archivedCount": 2,
    "typedMemoryDocCount": 1,
    "recallMatchCount": 1,
    "overBudgetCount": 2,
    "maxPressure": 116
  }
}
```

## Long-Term Goal Delta

This phase strengthens the Claude Code parity track in two places:

- context budget pressure is no longer only an immediate repair item;
- repeated repair knowledge becomes durable typed feedback memory that can be recalled into later child Agent sessions.

Remaining directions:

- add automatic typed-memory decay and promotion for repaired pressure categories;
- expose context usage repair typed memory as a dedicated Memory Center drill-down panel;
- distill compact retry, pre/post hook, and PTL emergency downgrade failures into typed feedback memory;
- add stronger proof that recall scoring prefers these feedback memories only when the current WorkerContextPacket is under pressure.

## Status

Phase 121 is complete. The long-running CCM memory parity goal remains active.
