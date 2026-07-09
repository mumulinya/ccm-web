# Phase 111 - WorkerContextPacket Partial Compact Policy

## Goal

Move WorkerContextPacket compaction closer to Claude Code-style pressure-based context management. Phase 110 could compact metadata categories, but it still compacted all supported metadata fields once metadata compaction was attempted. Phase 111 adds an explicit policy decision based on `context_usage.top_categories`.

## What Changed

- Added `ccm-worker-context-partial-compact-policy-v1`.
- Metadata partial compact now selects categories from WorkerContextPacket `context_usage.top_categories`.
- The policy records:
  - supported categories,
  - selected categories,
  - skipped categories,
  - candidate ranking and token/char pressure,
  - `max_categories`,
  - whether fallback selection was used.
- Retry ledger now stores `partial_compact_policy`.
- Assignment bindings persist `worker_context_packet_partial_compact_policy`.
- Compact hook post entries include selected/skipped policy categories.
- WorkerContextPacket rendering includes `partial_compact_policy=...; skipped=...`, so a fresh child Agent session can see why a category was compacted.
- Memory Center reports `partialCompactPolicyCount` and validates policy schema when present.

## Why It Matters

The child Agent should receive a context packet shaped by actual pressure, not by a fixed compaction order alone. This phase prevents small metadata fields from being compacted just because another metadata category is large. It preserves unselected contract/dependency context while compacting only the categories that caused the budget pressure.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`
- Regression selftests for metadata partial compact, replay brief partial compact, memory-first retry, compact retry, pre-dispatch gate, compact hook ledger, memory reinjection proof, and WorkerContextPacket usage.

## Follow-Up Direction

- Persist policy decisions into a long-term compact outcome ledger for later distillation.
- Add ignore-memory semantics for child sessions that should intentionally suppress memory recall.
- Add PTL-style emergency downgrade when repeated compact attempts still cannot recover the worker packet.
