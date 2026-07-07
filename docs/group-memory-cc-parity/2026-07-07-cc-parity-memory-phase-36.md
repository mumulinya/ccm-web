# CCM group memory CC parity - phase 36

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like recovered-context discipline for fresh child-Agent sessions. Phase 35 made post-compact recovered-memory usage visible in Memory Center. Phase 36 turns that signal into stricter acceptance: every injected post-compact candidate must be classified by the child Agent as `used`, `ignored`, or `verified` before the post-compact reinjection gate can pass.

## Implemented

- Added structured post-compact candidate usage to child-Agent receipts.
  - `CCM_AGENT_RECEIPT` now supports `postCompactCandidateUsage`.
  - Each row can carry `gateId`, `candidateId`, `usageState`, and `reason`.
  - Accepted `usageState` values are `used`, `ignored`, and `verified`; common aliases such as `checked`, `reviewed`, `skipped`, and `applied` are normalized.

- Upgraded post-compact reinjection gate validation in `backend/modules/collaboration/collaboration.ts`.
  - A receipt that classifies only one injected candidate no longer passes the whole gate.
  - Missing candidate classifications are surfaced as `missing_candidate_usage_candidate_ids`.
  - The aggregate visible status now prioritizes failures from outside to inside: missing gate reference, missing candidate reference, then missing candidate usage classification.
  - Structured `postCompactCandidateUsage` rows and legacy `memoryUsed` / `memoryIgnored` natural-language declarations are both supported.

- Updated child-Agent handoff and memory context instructions.
  - `backend/agents/worker-handoff.ts` now includes `postCompactCandidateUsage` in required receipt fields and JSON examples.
  - `backend/modules/collaboration/memory.ts` now records the stricter receipt contract in the reinjection gate and rendered memory packet.
  - Direct task prompts now include the same strict post-compact candidate requirement.

- Improved coordination summaries and targeted rework.
  - Task coordination summaries now expose missing candidate IDs, not only gate IDs.
  - Targeted rework messages tell the child Agent which recovered-memory candidates still need `used` / `ignored` / `verified`.
  - Duplicate `receipts` / `receipt_statuses` rows are deduped by Agent in coordination summaries, preferring full receipts over older summary rows.

- Added selftest coverage.
  - Structured candidate usage rows pass when every candidate is classified.
  - Partial candidate usage fails the strict gate.
  - Missing usage summaries now retain candidate-level IDs for UI and rework.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `collaboration.runPostCompactDispatchMarkerVisibleSelfTest()`
- `collaboration.runMemoryDispatchGateReceiptValidationSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `memory.runGroupTypedMemoryContextSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memory.runGroupMemoryDispatchFreshnessGateSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`

## Next Upgrade Direction

- Add Memory Center quality checks that detect archived or repeatedly ignored candidates being promoted back into primary task context.
- Add per-group post-compact usage trend summaries so multiple group chats can be compared for stale recovered-context pressure.
- Add a hard acceptance metric for "strict candidate classification rate" across recent child-Agent runs.

Long-term status: active. The system now requires per-candidate post-compact recovered-memory classification before accepting a child-Agent result, but the full CC-parity memory objective remains ongoing.
