# Phase 127 - Pressure Feedback Partial Compact Policy

Date: 2026-07-09

## Goal

Connect aged pressure recall usage feedback to WorkerContextPacket partial compact action selection.

Before this phase, CCM could record whether pressure-boosted typed `MEMORY.md` documents were used or ignored, and Phase 126 made that feedback time-aware. The feedback still mostly affected future typed memory recall. The next parity step is using that measured memory behavior to choose how CCM acts under context pressure.

## Implemented

- Added pressure recall usage strategy bias in `backend/modules/collaboration/group-orchestrator.ts`.
- `buildWorkerContextMetadataPartialCompactPolicyForCoordinator` now accepts pressure recall usage summaries.
- When `worker-context-compact-strategy-memory.md` has fresh weighted `used` or `verified` feedback, compact outcome strategy memory receives bounded influence over partial compact category selection.
- Empty pressure usage summaries are not injected, so WorkerContextPacket size does not grow when there is no useful history.
- The policy method now distinguishes the stronger path:
  - `usage_top_category_pressure_with_outcome_strategy_and_pressure_recall_usage`
- Policy candidates now carry:
  - `selection_score`
  - `pressure_recall_usage_adjustment`
  - `strategy_preferred`
- Policy output now carries:
  - `pressure_recall_usage_strategy_bias`
  - `pressure_recall_usage_summary`
- `renderWorkerContextPacket` now renders:
  - `pressure_recall_usage_bias=<recommendation>; trust=<score>; adjustment_cap=<N>`
- Compact outcome ledger normalization now preserves pressure recall usage bias metadata.
- MCC partial compact policy validation now accepts the extended `usage_top_category_pressure*` method family.

## Acceptance

New selftest:

- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`

Key checks:

- Baseline policy with compact outcome strategy but no pressure usage feedback still follows token pressure and selects `constraints_and_documents`.
- Fresh `used` and `verified` feedback for `worker-context-compact-strategy-memory.md` promotes compact strategy memory.
- With that feedback, policy selects `dependencies` even when it has fewer raw tokens, because historical compact outcomes recovered better there.
- Rendered WorkerContextPacket exposes `pressure_recall_usage_bias=promote_pressure_recall`.

Regression checks passed:

- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runWorkerContextCompactStrategyMemorySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`
- `runMemoryCenterWorkerContextPacketPressureRecallTypedMemoryUsageSelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyTypedMemorySelfTest`

Build validation:

- `npm run build:backend`
- `npm --prefix frontend run build`
- `npm run check`
- `npm run build`

Final dist validation:

- `runWorkerContextPartialCompactPressureRecallUsageStrategySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- `runGroupTypedMemoryWorkerContextPressureRecallSelfTest`

## Stable Memory

CCM can now use child Agent pressure memory feedback to choose compact actions, not only to rank future memory recall. When a pressure typed `MEMORY.md` about compact strategy is freshly used or verified, partial compact policy gives bounded extra weight to compact outcome strategy memory. This lets a WorkerContextPacket choose the category that historically recovered dispatch readiness, even when that category is not the largest token bucket.

The behavior stays conservative: no pressure usage history means no extra metadata and no pressure usage adjustment; stale or ignored pressure usage does not promote the strategy.

## Next Direction

Next parity work should broaden this from local group feedback to multi-group memory:

- aggregate pressure recall usage hints across groups per project Agent;
- expose partial compact pressure feedback in Memory Center UI;
- create repair work items when high-pressure packets repeatedly select stale compact strategies;
- add global Agent arbitration so global memory can recommend compact strategy only when weighted project evidence is fresh.
