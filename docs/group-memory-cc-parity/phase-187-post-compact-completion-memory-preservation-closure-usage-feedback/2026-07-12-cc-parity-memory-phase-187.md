# Phase 187: Closure Memory Usage Feedback And Recall Priority

Date: 2026-07-12

## Goal

Close the loop after Phase 186 injects post-compact preservation-repair closure MEMORY.md into a fresh child Agent session.

Every session must persist whether it used, verified, or ignored the closure memory. Invalid receipts must enter the existing main-Agent repair sidecar. Repeated ignored or noncompliant outcomes may lower generic recall priority, but they must never delete immutable closure history or block an exact corrected-outcome query.

## Implemented

### Group-isolated usage ledger

New per-group sidecar:

`.post-compact-completion-memory-preservation-closure-usage-ledger.json`

Each idempotent entry records:

- group, project, Agent, task and execution identity;
- WorkerContext packet and binding identity;
- current task Agent and native session identity;
- receipt source and status;
- closure document path;
- `used`, `verified`, `ignored`, or `mentioned` state;
- `currentSourceVerified`, compliance, stale state and ignored reason;
- the related corrected-receipt repair work-item ID.

Entry identity excludes scan time, so rescanning the same receipt does not duplicate feedback.

### Corrected-receipt recovery

Feedback recording now runs after the existing receipt repair sidecar is synchronized. This lets a noncompliant entry retain the exact repair work-item identity.

When a repair has a strictly verified corrected receipt, feedback is read from the corrected proof and its current repair-session task/native IDs instead of replaying the original bad receipt. A valid corrected receipt clears the active repair recommendation and restores normal recall promotion while preserving the earlier stale row as audit evidence.

### Recall recommendations

The usage summary emits one of:

- `require_receipt_repair_before_reuse`
- `deprioritize_closure_recall`
- `promote_but_reverify_current_source`
- `caution_stale_history_reverify_current_source`
- `neutral_reverify_current_source`

Policy:

- the latest noncompliant receipt requires repair before generic reuse;
- repeated ignored receipts lower generic closure recall priority;
- a fresh compliant used/verified receipt promotes recall but still requires current-source verification in every later session;
- historical stale feedback remains visible but does not permanently poison a later corrected receipt.

### Generic suppression and exact override

`buildAgentMemoryContextBundle` consumes the usage summary before constructing closure recall.

For `deprioritize_closure_recall` or `require_receipt_repair_before_reuse`:

- generic closure queries omit the closure document and closure rows;
- an exact work-item, failed retry/outcome, or corrected retry/outcome query still recalls the immutable evidence;
- the archive row count and MEMORY.md remain unchanged;
- current-source and fresh-session receipt requirements remain mandatory.

### Memory Center quality checks

Registered:

- `post_compact_completion_memory_preservation_closure_usage_feedback`
- `post_compact_completion_memory_preservation_closure_receipt_repair`
- `post_compact_completion_memory_preservation_closure_recall_priority`

They report per-session feedback coverage, noncompliant receipt repair coverage, generic recall suppression, exact identity recovery and immutable archive preservation.

Memory Center only creates diagnostic work items, candidates and briefs. It does not create a real child Agent task.

## Verification

### Phase 187 end-to-end self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest`

Result: 10/10 passed.

The test uses three isolated groups:

- Group A returns a compliant verified receipt and receives `promote_but_reverify_current_source`.
- Group B returns two ignored receipts from distinct sessions; generic recall is suppressed while exact corrected-outcome recall remains available.
- Group C omits `currentSourceVerified`, enters the existing repair sidecar, then supplies a corrected receipt; the repair closes and the recommendation recovers.

It also verifies idempotent rescans, four distinct task/native sessions, no cross-group entries, unchanged closure archives, all three quality checks, and no real task creation.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 19/19 passed.

Coverage includes provider switch decision receipts, provider execution ranking, provider ranking receipt repair, replay and metadata partial compact, partial-compact policy, PTL downgrade and typed memory, ignore-memory policy/receipt/repair, and the Phase 181-187 post-compact receipt, completion, preservation, closure and feedback chain.

## Invariants

- Every ledger and recall decision is strictly scoped by `groupId`.
- Provider execution history remains ranking evidence only, never authorization.
- Explicit provider switches still require a fresh valid receipt/checksum, local authority and task compatibility.
- Historical repair completion is recovery evidence, not permanent repository truth.
- Historical task/native sessions never become authority for a new child session.
- Every fresh child session must return `memoryUsed` or `memoryIgnored` for surfaced memory.
- Used or verified memory requires `currentSourceVerified=true`; ignored memory requires a reason.
- Recall feedback changes priority, not immutable archive retention.
- Memory Center never dispatches a real child Agent task by itself.

## Next Audit

Phase 188 should add time-aware feedback decay and task-family relevance calibration. Old ignored feedback should gradually lose ranking weight, while repeated recent feedback for the same task family remains influential. Exact identity recall, immutable history and all authorization boundaries must remain unchanged.
