# CCM group memory CC parity - phase 32

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like memory behavior. Phase 31 made each child Agent receipt classify post-compact reinjection candidates as used, ignored, verified, or mentioned-only. Phase 32 persists those classifications into a per-group ledger and feeds them back into future child-Agent context bundles.

This closes an important loop: recovered memory is not only validated for the current task, but becomes durable evidence for future recall, scoring, and distillation.

## Implemented

- Added a per-group post-compact candidate usage ledger.
  - File location: `CCM_DIR/group-memory-post-compact-candidate-usage/<groupId>.json`
  - Schema: `ccm-group-post-compact-candidate-usage-ledger-v1`
  - Entry schema: `ccm-group-post-compact-candidate-usage-entry-v1`
  - Record schema: `ccm-group-post-compact-candidate-usage-record-v1`

- Added exported memory APIs in `backend/modules/collaboration/memory.ts`.
  - `getGroupPostCompactCandidateUsageLedgerFile`
  - `readGroupPostCompactCandidateUsageLedger`
  - `recordGroupPostCompactCandidateUsageLedger`
  - `buildGroupPostCompactCandidateUsageSummary`
  - `runGroupPostCompactCandidateUsageLedgerSelfTest`

- Connected delivery summaries to the ledger.
  - `buildDeliverySummary` now records `post_compact_reinjection_gate_receipt_rows` into the usage ledger when a task has a group id.
  - Duplicate writes are de-duplicated by stable `entry_id`, so repeated summary generation does not inflate counts.
  - Delivery summary exposes `post_compact_candidate_usage_ledger` and `post_compact_candidate_usage_ledger_file`.

- Fed usage history back into child-Agent memory context.
  - `buildAgentMemoryContextBundle` now reads usage history for the target project and current reinjection candidates.
  - Matching works by `candidate_id` or candidate value, because a new compact boundary may regenerate candidate ids while the file/command value remains the same.
  - `raw_sources` exposes `group_post_compact_candidate_usage_ledger_file`.
  - Rendered child context now includes a "压缩重注入候选使用账本" section when history exists.

- Added scoring hints for future recall and distillation.
  - Repeated used/verified candidates get `promote_recall`.
  - Repeated ignored candidates can get `deprioritize_or_distill`.
  - Mentioned-only candidates can get `require_usage_receipt`.
  - Neutral candidates still instruct the child Agent to verify current repo state before applying.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `memory.runGroupTypedMemoryContextSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memory.runGroupMemoryDispatchFreshnessGateSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `collaboration.runPostCompactDispatchMarkerVisibleSelfTest()`

## Next Upgrade Direction

- Use the ledger recommendations directly inside typed MEMORY.md recall scoring, so repeated `used` / `verified` recovered facts rank higher and repeated `ignored` facts rank lower.
- Add a strict mode where every injected `pcrc_*` candidate must be classified, not only referenced candidates.
- Let long-term log distillation consume the usage ledger and rewrite stale recovered memories into lower-priority or archived typed memory docs.

Long-term status: active. The memory system is closer to CC-style recovered-context learning, but the full CC-parity goal is not complete yet.
