# Phase 185: Completion-Memory Compaction Preservation Repair

Date: 2026-07-12

## Goal

Turn every failed Phase 184 corrected-receipt completion-memory preservation proof into an idempotent group-main-Agent repair pipeline:

1. failed compact proof -> repair work item;
2. work item -> main-Agent dispatch candidate;
3. candidate -> self-contained no-real-task dispatch brief;
4. only a newer, different, exact corrected compact outcome may close the item.

Memory Center remains a diagnostic/control sidecar. It never creates a real child-Agent task.

## Implemented

### Persisted outcome proof normalization

`normalizeWorkerContextCompactOutcomeEntryForCenter` now preserves the full:

- `ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1` proof;
- before/after completion docs and required docs;
- work-item and timeline identities;
- historical task/native sessions;
- current binding/task/native session;
- receipt acceptance and authority-boundary flags;
- missing identity arrays and preservation gaps.

This makes the compact outcome ledger authoritative for repair closure instead of relying on retry-side fallback state.

### Idempotent repair work items

Source:

`post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair`

The deterministic work-item identity binds:

- group ID;
- assignment and failed retry/hook/outcome;
- completion docs, work items and timeline IDs;
- current binding/task/native session;
- preservation-gap signature.

Repeated scans do not duplicate or increment an unchanged work item. Authority/session loss is `critical`; other identity loss is `high`.

### Main-Agent dispatch chain

Open repair items enter the existing replay-repair sidecar as:

- `ccm-replay-repair-main-agent-dispatch-candidate-v1`;
- `ccm-replay-repair-main-agent-dispatch-brief-v1`.

Candidate and brief preserve exact failed proof identity, current-session authority, historical-session evidence, and freshness boundaries. Both declare that Memory Center must not create a real task; the group main Agent explicitly owns dispatch.

### Strict corrected-retry closure

A repair closes only when a later compact outcome:

- has a different retry ID and outcome ID;
- is newer than the failed outcome;
- belongs to the same group, assignment and project;
- sets `required=true`, `preserved=true`, and `gaps=[]`;
- records `post_compact_receipt_memory_usage_repair_completion_preserved=true`;
- restores every required doc/work-item/timeline/historical-session identity;
- preserves the exact current binding/task/native session;
- keeps historical sessions out of current authority;
- preserves both usage and current-session acceptance requirements.

Completion metadata:

- `completion_source=post_compact_receipt_memory_usage_repair_completion_compaction_preservation_corrected_retry`
- `resolutionReason=completion_memory_compaction_preservation_corrected_retry_verified`
- proof schema `ccm-post-compact-receipt-memory-usage-repair-completion-compaction-preservation-repair-closure-v1`

A child receipt alone cannot close this work item. A valid corrected outcome in another group also cannot close it.

### Quality checks

Registered checks:

- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_work_items`
- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_candidates`
- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_dispatch_briefs`
- `post_compact_receipt_memory_usage_repair_completion_compaction_preservation_repair_closure`

### Regression fixture hardening

The replay-brief and metadata partial-compaction fixtures now leave stable headroom for the accumulated long-term audit metadata while still proving that their huge initial packets are over budget, partial compact recovers them, and task text is not compacted.

## Verification

Dedicated self-test:

`runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationRepairSelfTest`

Result: 9/9 checks passed.

Verified:

- idempotent work-item creation;
- exact candidate metadata;
- self-contained no-real-task brief;
- wrong historical-session authority remains pending;
- cross-group corrected outcome remains isolated;
- valid newer corrected outcome closes exactly once;
- ready candidate/brief retire after closure;
- closure quality passes;
- Memory Center creates no task.

Combined regression: 25/25 passed, covering Phases 176-185, read-plan repair, compaction retry, memory-first compact, compact outcome, provider-ranking repair/receipt, replay and metadata partial compact, PTL, ignore-memory, provider ranking, runtime kernel and runtime usage.

The final TypeScript emit contains Phase 185 and the dedicated self-test passes from `ccm-package/dist`. A later full-project `tsc` invocation is currently blocked by unrelated concurrent edits in `backend/test-agent/artifacts.ts` where `CommandRunResult` lacks `timeoutMs`, `timedOut`, and `abortRequested`; Phase 185 files themselves produced no TypeScript diagnostics.

## Invariants

- Multi-group state remains isolated by group ID and per-group ledgers.
- Historical repair completion is recovery evidence, not permanent repository truth.
- Every fresh child session still needs current-source revalidation and explicit memory usage/ignore evidence.
- Historical task/native sessions can never become current authority.
- Provider switch execution history remains ranking evidence only, never authorization.
- Any explicit provider switch still needs a fresh valid receipt/checksum, local authority and task compatibility.
- Memory Center never creates a real child task.

## Next Audit

Phase 186 should distill verified Phase 185 corrected-retry closure into typed group memory and make it recallable in later compact/new-child sessions. The typed record must retain failed/corrected retry and outcome IDs, exact restored identity, group/session boundaries and the stale-evidence/current-source-reverify rule, while preventing the historical completion from becoming permanent repository authority.
