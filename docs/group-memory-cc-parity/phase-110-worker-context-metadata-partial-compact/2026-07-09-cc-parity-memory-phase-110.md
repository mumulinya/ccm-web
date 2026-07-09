# Phase 110 - WorkerContextPacket Metadata Partial Compact

## Goal

Continue moving CCM toward Claude Code-style memory behavior by making WorkerContextPacket retry use top-category context pressure before falling back to task text compaction.

Phase 109 compacted replay repair briefs. Phase 110 adds metadata partial compact for:

- `constraints_and_documents`
- `contract_injections`
- `dependencies`

## What Changed

- The group orchestrator now passes main-agent `analysis` into the outer WorkerContextPacket, so user constraints and document findings are visible as structured context usage categories.
- The retry chain now runs:
  1. memory-first compaction,
  2. replay repair brief partial compaction,
  3. metadata partial compaction,
  4. task head/tail compaction as the final fallback.
- Added schema `ccm-worker-context-metadata-partial-compaction-v1`.
- Added schema `ccm-worker-context-partial-compaction-set-v1` for future multi-category partial compactions.
- Metadata partial compaction preserves:
  - user constraints and document findings as compacted strings,
  - dependency `project`, `reason`, `dependency_id`,
  - contract `injection_id`, `source_agent`, `target_agent`, `endpoint`, and receipt-reference requirement.
- WorkerContextPacket rendering now shows multiple partial compaction categories when present.
- Memory Center now validates replay brief partial compaction, metadata partial compaction, and compaction sets.

## Why It Matters

Fresh third-party child-agent sessions need enough memory and coordination context to act correctly, but long document findings, contract summaries, and dependency narratives can crowd out the real task.

This phase lets CCM shrink coordinator metadata first while keeping the actual work instruction unchanged and preserving the IDs a child agent must cite in its receipt.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextMetadataPartialCompactionRetrySelfTest`
- `runMemoryCenterWorkerContextPacketMetadataPartialCompactRetrySelfTest`
- Regression selftests for replay brief partial compact, memory-first retry, compact hook ledger, memory reinjection proof, and WorkerContextPacket usage.

## Follow-Up Direction

- Add policy scoring so the retry path chooses only the most valuable categories based on `context_usage.top_categories`, rather than compacting every supported metadata field.
- Persist per-category compact outcomes into a long-term memory distillation ledger.
- Add ignore-memory semantics and PTL emergency downgrade around repeated over-budget failures.
