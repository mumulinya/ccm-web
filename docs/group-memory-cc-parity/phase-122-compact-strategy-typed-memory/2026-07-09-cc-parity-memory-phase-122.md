# Phase 122 - Compact Strategy Typed Memory

Date: 2026-07-09

## Goal

Continue the long-running CCM memory parity goal by turning WorkerContextPacket compact outcome and compact strategy sidecars into typed `MEMORY.md` context that future child Agent sessions can recall.

Phase 112 and Phase 113 already produced compact outcome ledgers and compact strategy JSON. This phase makes those strategy samples usable as normal typed memory.

## Why This Matters

The group main Agent needs more than a local JSON strategy sidecar. Each third-party child Agent session starts fresh, so compact recovery experience must be available through the same typed memory recall pipeline as other durable group memory.

The new typed memory records:

- which compact categories were preferred,
- which categories or outcomes should be avoided or reviewed,
- whether `free_token_delta` actually recovered budget,
- whether `task_hash_unchanged` preserved the task body,
- which compact method and selected categories were used.

## Implementation

### Typed Memory Distillation

Added `distillCompactStrategyToTypedMemory` in `backend/modules/collaboration/group-memory-index.ts`.

It reads compact strategy JSON and compact outcome entries, writes the archive to the typed-memory distillation ledger as `compactStrategyArchive`, and upserts:

- `worker-context-compact-strategy-memory.md`
  - type: `reference`
  - source: `auto:compact-strategy-memory-distillation`
  - captures reusable compact recovery strategy.
- `worker-context-compact-strategy-cautions.md`
  - type: `feedback`
  - source: `auto:compact-strategy-memory-distillation`
  - captures blocked outcomes and categories that require review.

### Memory Center Quality Check

Added `worker_context_packet_compact_strategy_typed_memory` in `backend/modules/knowledge/memory-control-center.ts`.

The check verifies:

- compact outcome samples and strategy memory exist,
- typed-memory distillation runs,
- `compactStrategyArchive` covers outcome/category samples,
- reference typed memory exists,
- caution typed memory exists when blocked or avoid samples exist,
- typed docs contain `free_token_delta`, category strategy, and task preservation signals,
- typed recall can find the compact strategy memory.

### Selftest

Added `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`.

The selftest seeds one recovered dependency compact outcome and one blocked `constraints_and_documents` compact outcome. It then builds strategy memory, distills typed memory, verifies both typed docs, checks the ledger archive, and confirms recall can retrieve the compact strategy memory.

## Validation

Passed:

- `npm run build:backend`
- `runMemoryCenterWorkerContextPacketCompactStrategyTypedMemorySelfTest`
- related dist selftests:
  - `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest`
  - `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`
  - `runMemoryCenterWorkerContextPacketContextUsageRepairTypedMemorySelfTest`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`
- final post-build dist selftest replay for the new compact strategy typed-memory check and adjacent compact/PTL checks

Key selftest result:

```json
{
  "pass": true,
  "report": {
    "status": "ok",
    "coverageRate": 100,
    "outcomeCount": 2,
    "strategySampleCount": 2,
    "archivedOutcomeCount": 2,
    "categoryCount": 2,
    "preferredCount": 1,
    "typedDocCount": 2,
    "recallMatchCount": 2
  }
}
```

## Long-Term Goal Delta

This phase closes another gap between local recovery telemetry and child-Agent usable memory:

- compact outcome ledger remains the audit source,
- compact strategy JSON remains the scored sidecar,
- typed `MEMORY.md` now becomes the recall surface for future child Agent sessions.

Remaining directions:

- distill PTL emergency downgrade hints into typed feedback memory;
- connect compact strategy typed memory to recall ranking only when a future WorkerContextPacket is under pressure;
- add a dedicated Memory Center drill-down panel for compact strategy typed memory;
- add decay and promotion policy so stale compact strategies are deprioritized when later outcomes contradict them.

## Status

Phase 122 is complete. The long-running CCM memory parity goal remains active.
