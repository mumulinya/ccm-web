# Phase 109 - WorkerContextPacket Partial Compact

## Goal

Bring CCM closer to Claude Code-style memory compaction by adding a category-level partial compact step before task text compaction. The immediate target is `replay_repair_dispatch_briefs`, because child project agents start fresh third-party sessions and must receive compact but recoverable repair/proof context.

## What Changed

- Added replay repair brief partial compaction in `backend/modules/collaboration/group-orchestrator.ts`.
- Inserted the retry order as:
  1. memory-first compact,
  2. replay repair brief partial compact,
  3. deterministic task head/tail compact.
- Preserved required replay repair identifiers:
  `brief_id`, `work_item_id`, `source`, `target_project`, `proof_entry_id`, `request_patch_checksum`, `provider_reproof_status`, `provider_reproof_reason`, `reproof_candidate_id`, `timeline_binding_id`, `original_work_item_id`, `request_telemetry_session_status`, `request_telemetry_dispatch_status`, `runner_request_id`, and `execution_id`.
- Forced `required_receipt_reference=true` and `should_create_real_task=false` after partial compact.
- Added retry proof schema `ccm-worker-context-replay-brief-partial-compaction-v1`.
- Persisted `worker_context_packet_partial_compaction` in assignment bindings.
- Rendered `partial_compaction=replay_repair_dispatch_briefs` inside WorkerContextPacket retry text so a fresh child agent session can see what was compacted.
- Extended Memory Center compaction retry validation and reporting with `partialCompactCount` and `partialOmittedChars`.

## Why It Matters

Before this phase, an over-budget WorkerContextPacket could recover by compacting memory first, but if memory compaction was not enough the next fallback was task text compaction. That could damage the child agent's actual work instruction even when the real pressure came from replay repair proof context.

Phase 109 lets CCM shrink replay repair proof context first while preserving the receipt/proof handles needed for provider re-proof closure.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextPartialCompactionRetrySelfTest`
- `runMemoryCenterWorkerContextPacketPartialCompactRetrySelfTest`

## Follow-Up Direction

- Add partial compact strategies for other WorkerContextPacket categories, especially `constraints_and_documents`, `contract_injections`, and dependency context.
- Add per-category compact policy selection based on `context_usage.top_categories`.
- Add long-term replay of partial compact decisions into the group memory compaction ledger so later sessions can learn which categories repeatedly overflow.
