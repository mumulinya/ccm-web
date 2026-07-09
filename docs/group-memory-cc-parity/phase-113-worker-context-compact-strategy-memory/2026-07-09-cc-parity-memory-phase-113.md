# Phase 113 - WorkerContextPacket Compact Strategy Memory

## Goal

Turn WorkerContextPacket compact outcomes into reusable strategy memory. Phase 112 made compact results durable, but they were still passive samples. Phase 113 distills those samples into group-level compact strategy hints and feeds them back into future WorkerContextPacket partial compact policy decisions.

## What Changed

- Added a long-term sidecar under `~/.cc-connect/group-memory-worker-context-compact-strategies/`.
- Added schema identity `ccm-worker-context-compact-strategy-memory-v1`.
- The group orchestrator now refreshes compact strategy memory after appending compact outcome rows.
- Strategy memory aggregates category-level results:
  - attempts,
  - recovered/blocked counts,
  - recovery rate,
  - average token/free-token recovery,
  - average partial omitted chars,
  - task preserved/compacted counts,
  - strategy score,
  - preferred and avoid categories.
- Metadata partial compact policy now reads strategy memory for the current group.
- Realtime `context_usage.top_categories` remains the primary pressure signal; strategy memory is used to rank equal-pressure candidates and to order fallback categories.
- WorkerContextPacket rendering now exposes `compact_strategy_memory=...; preferred=...` when a retry policy used strategy memory.
- Memory Center now has a quality check: `worker_context_packet_compact_strategy_memory`.
- Added orchestrator and Memory Center selftests for strategy memory distillation and usage.

## Why It Matters

Each project child Agent starts a fresh third-party session, so CCM cannot rely on implicit conversation history. The main group Agent must compress and re-inject memory into every WorkerContextPacket. Strategy memory makes that loop adaptive:

- outcome ledger records what happened,
- strategy memory learns which metadata categories recovered budget,
- partial compact policy uses that memory on the next retry,
- rendered WorkerContextPacket tells the child Agent which strategy memory influenced the compact decision.

This moves CCM from static compact order toward Claude Code-style context pressure management with durable feedback.

## Recovery Contract

- Pre-dispatch over-budget hold remains authoritative.
- No empty strategy memory is injected into the WorkerContextPacket.
- Without historical samples, existing top-category partial compact behavior stays unchanged.
- Strategy memory does not bypass memory-first, replay-brief partial compact, metadata partial compact, or task compact ordering.
- If task hash is unchanged, task compaction remains recorded as skipped/preserved.
- Compact outcome ledger remains the source of truth; strategy memory is a derived sidecar.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextCompactStrategyMemorySelfTest`
- `runWorkerContextCompactOutcomeLedgerSelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest`
- `runMemoryCenterWorkerContextPacketCompactOutcomeLedgerSelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactPolicySelfTest`

Final validation for this phase should include:

- `npm run check`
- `npm run build`
- Re-run the Phase 113 selftests after the final build.

## Follow-Up Direction

- Promote repeated failed strategy categories into PTL-style emergency downgrade hints.
- Distill strategy memory into typed MEMORY.md so group/global Agents can reason over longer time windows.
- Add ignore-memory semantics for sessions that intentionally suppress recall.
- Use strategy memory to tune max item/string limits per category when repeated compaction is insufficient.
