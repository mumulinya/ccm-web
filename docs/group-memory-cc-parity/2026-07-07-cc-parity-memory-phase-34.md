# CCM group memory CC parity - phase 34

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like recovered-context learning. Phase 33 made post-compact candidate usage affect typed `MEMORY.md` recall scoring. Phase 34 feeds the same usage signal into long-term log distillation, so repeatedly ignored or under-classified recovered candidates are archived as low-priority memory instead of reappearing as strong recovered context.

## Implemented

- Added post-compact usage distillation in `backend/modules/collaboration/group-memory-index.ts`.
  - `distillGroupMessagesToTypedMemory` now accepts `postCompactCandidateUsage`.
  - Candidates with `deprioritize_or_distill` or `require_usage_receipt` are written into a dedicated typed memory doc.
  - Generated doc: `post-compact-candidate-usage-archive.md`.
  - Source marker: `auto:post-compact-usage-distillation`.

- Added a low-priority archive document format.
  - Schema: `ccm-group-post-compact-candidate-usage-distillation-v1`.
  - Records `candidate_id`, value, used / verified / ignored / mentioned counts, and state.
  - Instructs future Agents not to promote archived candidates unless the current task explicitly matches and current repo state is re-verified.

- Persisted archive metadata into `.distillation-ledger.json`.
  - `postCompactUsageArchive.archived_count`
  - `postCompactUsageArchive.rows`
  - `updatedAt`

- Connected child-Agent context bundle distillation to usage history.
  - `buildAgentMemoryContextBundle` now computes post-compact gate and usage summary before long-term log distillation.
  - The usage summary is passed to both distillation and typed recall scoring.

- Added selftest coverage.
  - `runGroupTypedMemoryPostCompactUsageDistillationSelfTest` verifies archive doc creation, ledger persistence, and recall-time deprioritization diagnostics.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `memory.runGroupTypedMemoryContextSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memory.runGroupMemoryDispatchFreshnessGateSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `collaboration.runPostCompactDispatchMarkerVisibleSelfTest()`
- `collaboration.runMemoryDispatchGateReceiptValidationSelfTest()`

## Next Upgrade Direction

- Surface post-compact usage archive and recall adjustments in the Memory Center UI.
- Add strict mode requiring every injected `pcrc_*` candidate to be classified by child Agent receipts.
- Add compaction quality checks that fail or degrade when archived ignored candidates are still promoted as primary recovered context.

Long-term status: active. The system now learns from ignored recovered candidates and distills them into low-priority memory, but the full CC-parity memory objective remains ongoing.
