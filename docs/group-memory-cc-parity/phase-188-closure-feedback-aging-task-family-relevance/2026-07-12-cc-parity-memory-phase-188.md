# Phase 188: Closure Feedback Aging And Task-Family Relevance

Date: 2026-07-12

## Goal

Prevent Phase 187 closure-memory feedback from becoming permanent global ranking state.

Old feedback must lose influence over time. Recent feedback must affect only related child-Agent task families. Exact closure identity, immutable history, fresh-session receipt requirements and all authorization boundaries remain unchanged.

## Implemented

### Exponential feedback aging

Closure usage feedback now uses the existing CCM exponential-decay model with explicit defaults:

- half-life: 14 days;
- stale boundary: 45 days;
- minimum decay weight: 0.

Each relevant feedback entry receives:

- `age_days`;
- `decay_weight`;
- task-family relevance;
- combined `effective_weight`.

The dynamic summary exposes raw and weighted used, verified and ignored counts. Historical entries remain in the ledger; only their ranking influence decays.

### Task-family identity

New feedback entries persist:

- bounded task text;
- task-family key;
- normalized task-family tokens.

Task-family extraction removes generic memory, compact, repair, receipt and session terms. It retains task-specific English/path tokens and Chinese bigrams. Explicit task-family keys remain supported.

The current child task alone supplies the query family. Group goal, phase and message digest are excluded so long-lived group summaries cannot accidentally merge unrelated work.

### Relevance calibration

Feedback selection follows:

- exact task-family key: full relevance;
- related token family above the configured threshold: relevant;
- unrelated family: excluded from scoring;
- legacy entries without family metadata: global compatibility evidence, still subject to time decay;
- no task-family query: aggregate diagnostic view.

Related families receive a bounded relevance multiplier before time decay. Two recent ignored receipts for the same family can still lower generic closure recall priority. Old ignored receipts eventually fall below that threshold.

### Repair-state aging

A noncompliant receipt requires repair only while it is the latest relevant fresh feedback.

An old noncompliant receipt remains visible as stale audit evidence but cannot permanently block a later unrelated or corrected child session.

### Recall behavior

The Phase 187 priority rules now consume the task-family weighted summary:

- recent repeated ignored feedback suppresses generic closure recall only for related tasks;
- old ignored feedback becomes cautionary and stops suppressing;
- unrelated tasks receive a neutral recommendation;
- exact work-item/retry/outcome identity still overrides generic suppression;
- closure MEMORY.md and distillation archive rows are never removed.

### Memory Center quality check

Registered:

`post_compact_completion_memory_preservation_closure_feedback_aging_task_family`

It validates half-life metadata, family isolation, stale decay, unrelated-family exclusion and immutable archive counts across groups.

## Verification

### Phase 188 end-to-end self-test

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureFeedbackAgingTaskFamilySelfTest`

Result: 9/9 passed across two groups and three task families.

Observed scoring:

- two 133-day-old payment ignored receipts: weighted ignored `0.0028`, recommendation `caution_stale_history_reverify_current_source`;
- two recent search ignored receipts: weighted ignored about `1.998`, recommendation `deprioritize_closure_recall`;
- unrelated deployment task: zero matched feedback, recommendation `neutral_reverify_current_source`;
- another group with recent payment ignored receipts remains independently deprioritized.

The self-test also proves exact corrected-outcome recall, explicit 14/45-day aging metadata, immutable archives and no real task creation by Memory Center.

### Phase 187 compatibility

`runMemoryCenterPostCompactCompletionMemoryPreservationClosureUsageFeedbackSelfTest`

Result: 10/10 passed after the Phase 188 scoring change.

### Compilation

`npx tsc -p backend/tsconfig.json --pretty false`

Result: passed.

### Regression

Combined regression: 21/21 passed.

Coverage includes provider switch and provider ranking boundaries, replay/metadata partial compact, partial-compact policy, PTL, ignore-memory, Phase 181-188 post-compact memory repair and usage feedback, plus the pre-existing pressure-feedback aging test.

## Invariants

- Feedback never crosses `groupId`.
- Task-family feedback changes ranking only, never authorization.
- Provider execution history remains ranking evidence only.
- Explicit provider switches require a fresh valid receipt/checksum, local authority and task compatibility.
- Historical repair completion remains recovery evidence, not permanent repository truth.
- Historical task/native sessions never become current authority.
- Every fresh child session must return `memoryUsed` or `memoryIgnored` for surfaced memory.
- Used or verified requires `currentSourceVerified=true`; ignored requires a reason.
- Aging never deletes immutable feedback or closure archives.
- Exact closure identity remains recallable after generic priority suppression.
- Memory Center never creates a real child-Agent task by itself.

## Next Audit

Phase 189 should calibrate feedback confidence by independent session diversity and receipt source reliability. Repeated events from one reused session or duplicate provider source must not carry the same ranking confidence as consistent evidence from multiple fresh child sessions and providers.
