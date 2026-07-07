# CCM group memory CC parity - phase 31

Date: 2026-07-07

## Goal

Continue the long-term CCM memory-system goal toward Claude Code-like behavior. This phase focuses on post-compact memory reinjection receipts: a child Agent must not only mention that a recovered candidate was present, but must declare whether the candidate was used, ignored, or verified.

This matters because project child Agents are often fresh third-party sessions. After compaction, the group main Agent has to prove that recovered memory was actually considered by the child session, not silently dropped.

## Implemented

- Added tri-state post-compact candidate usage evaluation in `backend/modules/collaboration/collaboration.ts`.
  - Tracks `used`, `ignored`, `verified`, `mentioned`, and `unreferenced`.
  - Emits `candidate_usage_rows`, `candidate_usage_counts`, and candidate id lists.
  - Adds `missing_candidate_usage_gate_ids` when a child receipt references a candidate but does not say how it was handled.

- Split receipt quality checks into clearer layers.
  - Missing gate id remains `引用压缩后重注入 gate`.
  - Missing candidate id/value remains `声明压缩重注入候选`.
  - Missing tri-state usage is now `声明候选使用状态`.

- Fixed false positives in candidate usage parsing.
  - `重注入候选` no longer counts as `used` just because it contains `注入`.
  - English `all` now requires word boundaries, so filenames such as `callback.ts` do not imply "all candidates".

- Propagated the new state through user-visible summaries.
  - Delivery summary records missing candidate usage.
  - Acceptance gate blocks incomplete candidate usage receipts.
  - Agent coordination summary and coordination events include candidate usage counts and missing usage gate ids.
  - Receipt rework suggestions now say whether to补 gate、补 candidate、or补 used/ignored/verified.

- Updated frontend task experience.
  - `TaskExperienceCard.vue` recognizes `missing_candidate_usage`.
  - The compressed reinjection block shows used / ignored / verified counts.
  - `frontend/src/utils/taskExperience.js` creates targeted gaps for missing candidate usage.

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`

Passed Node selftests:

- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runPostCompactDispatchMarkerVisibleSelfTest()`
- `collaboration.runMemoryDispatchGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`
- `memory.runGroupTypedMemoryContextSelfTest()`
- `memory.runGroupMemoryDispatchFreshnessGateSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `workerHandoff.runWorkerHandoffSelfTest()`

## Next Upgrade Direction

- Add an optional stricter mode where every injected `pcrc_*` candidate must be explicitly classified, not only the referenced candidates.
- Persist post-compact candidate usage into a per-group ledger so future compaction can learn which recovered memories were useful, ignored, or only verified.
- Feed this usage ledger back into memory scoring so stale or repeatedly ignored memories are distilled or deprioritized.

Long-term status: active. The CC-parity memory goal is improved but not complete.
