# Phase 123 - PTL Emergency Typed Memory

Date: 2026-07-09

## Goal

Continue the long-running CCM memory parity goal by turning WorkerContextPacket PTL emergency downgrade hints into durable typed `MEMORY.md` feedback memory.

Phase 114 produced PTL emergency hint sidecars. This phase makes those emergency downgrade budgets available through the normal typed memory recall path for future child Agent sessions.

## Why This Matters

When compact retry keeps blocking dispatch, or the task body was compacted and the packet is still over budget, the group main Agent must stop normal retry and switch to a stricter emergency budget.

That emergency discipline must survive across fresh third-party child Agent sessions:

- shrink memory render budgets,
- shrink replay repair brief budgets,
- shrink metadata budgets,
- cap task body chars,
- preserve only proof/receipt/session/request identifiers and the minimum task goal needed for safe work.

## Implementation

### Typed Memory Distillation

Added `distillPtlEmergencyDowngradeToTypedMemory` in `backend/modules/collaboration/group-memory-index.ts`.

It reads:

- `ccm-worker-context-ptl-emergency-hint-v1`,
- blocked compact outcome rows,
- repeated failed compact categories,
- emergency retry budget recommendations.

It writes:

- typed memory doc: `worker-context-ptl-emergency-downgrade.md`
- type: `feedback`
- source: `auto:ptl-emergency-downgrade-distillation`
- distillation ledger archive: `ptlEmergencyArchive`

The document records `maxTaskChars`, memory render limits, replay repair brief limits, metadata limits, blocked outcomes, task-compacted failures, and failed compact categories.

### Memory Center Quality Check

Added `worker_context_packet_ptl_emergency_typed_memory` in `backend/modules/knowledge/memory-control-center.ts`.

The check verifies:

- PTL emergency hint/outcomes exist,
- typed-memory distillation runs,
- `ptlEmergencyArchive` is present,
- `worker-context-ptl-emergency-downgrade.md` is written,
- the doc contains emergency retry budgets and blocked outcome signals,
- typed memory recall can find the PTL emergency discipline.

### Selftest

Added `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`.

The selftest seeds three blocked compact outcomes, including one where the task was compacted and still blocked. It generates a critical PTL emergency hint, distills it to typed memory, verifies the archive and document body, and confirms recall hits the new feedback memory.

## Validation

Passed:

- `npm run build:backend`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`
- related dist selftests:
  - `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`
  - `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
  - `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`
- final post-build dist selftest replay for the new PTL emergency typed-memory check and adjacent compact/PTL checks

Key selftest result:

```json
{
  "pass": true,
  "report": {
    "status": "ok",
    "coverageRate": 100,
    "engagedCount": 1,
    "outcomeCount": 3,
    "blockedOutcomeCount": 3,
    "taskCompactedBlockedCount": 1,
    "failedCategoryCount": 1,
    "typedDocCount": 1,
    "recallMatchCount": 1
  }
}
```

## Long-Term Goal Delta

This phase closes the loop from repeated compact failure to child-Agent-usable emergency memory:

- compact outcome ledger remains the audit source,
- PTL emergency hint remains the operational sidecar,
- typed `MEMORY.md` now carries the emergency downgrade discipline into future fresh sessions.

Remaining directions:

- make recall scoring boost this PTL feedback only when a future WorkerContextPacket is actually in repeated-failure or emergency pressure;
- expose PTL typed memory as a dedicated Memory Center drill-down;
- add decay or supersession when later compact outcomes prove a less aggressive strategy is safe again;
- keep comparing CCM behavior against Claude Code memory compaction semantics phase by phase.

## Status

Phase 123 is complete. The long-running CCM memory parity goal remains active.
