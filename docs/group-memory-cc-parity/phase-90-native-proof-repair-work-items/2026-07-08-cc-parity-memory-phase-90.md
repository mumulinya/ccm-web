# Phase 90 - Native Apply Proof Repair Work Items

## Goal

Continue the long-running CCM memory parity goal by making weak API microcompact native apply proof chains actionable for the group main Agent. Phase 89 could detect when native request telemetry was not strongly bound to a task-agent session/snapshot or execution/runner dispatch; Phase 90 turns those gaps into repair work items that can be carried into child-Agent context.

## Implemented

- Added native apply proof repair classification in `backend/modules/knowledge/memory-control-center.ts`.
  - Session/snapshot gaps become `api_microcompact_native_session_binding` work items.
  - Execution/runner gaps become `api_microcompact_native_dispatch_binding` work items.
  - Receipt-only, stale telemetry, missing telemetry, and proof-ledger failures are mapped to explicit repair components.
- Added `syncApiMicrocompactNativeApplyProofRepairWorkItems` so group detail evaluation can materialize repair items into the existing `group-memory-replay-repair-work-items` sidecar ledger.
- Added `api_microcompact_native_apply_proof_repair_work_items` quality coverage, Memory Center overview reporting, and alert rows.
- Extended child-memory rendering in `backend/modules/collaboration/memory.ts` so repair work items carry proof entry, plan checksum, request patch checksum, request telemetry status, session status, dispatch status, and runner request id into child Agent context.
- Added `runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest`.
  - Confirms binding gaps create repair items.
  - Confirms duplicate sync is idempotent.
  - Confirms quality report covers the items.
  - Confirms child memory context mentions repair items.
  - Confirms resolved strong proof closes open native repair items.
- Fixed long execution id canonicalization.
  - `backend/agents/execution-kernel.ts` now trims edge hyphens after the 100-character cut so safe ids are idempotent.
  - Memory Center native proof lookup retries the canonical execution id before declaring execution missing.
  - This restored `runner_mismatch` classification for long selftest execution ids instead of incorrectly falling through to `missing_execution`.
- Hardened native proof selftest cleanup so replay repair sidecar files created during proof-detail rendering are removed after the test.
- During verification, reviewed unrelated UI source-label checks around main Agent decision/task cards; those display labels are outside this memory repair phase.

## Verification

Ran and passed:

- `npm run build`
- `npm run check`
- `node -e "...runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest()..."`
- `node -e "...runMemoryCenterApiMicrocompactNativeApplyProofSelfTest()..."`
- `node -e "...runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest()..."`
- `node -e "...runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest()..."`
- `node scripts/main-agent-decision-ui-selftest.mjs` was used during the pass to catch unrelated source-level display label regressions. It is not counted as the final Phase 90 gate because post-build/frontend synchronization repeatedly rewrote two display-label assertions outside the memory repair path.

Residue check:

- Native proof ledger, request telemetry ledger, and execution-kernel selftest files were clean after the final native proof/aging/dispatch tests.
- Historical replay-repair selftest sidecars from earlier phases still exist in `C:\Users\admin\.cc-connect\group-memory-replay-repair-work-items`; Phase 90 prevents new proof selftest sidecars from accumulating.

## Current Parity Step

The memory system now has a closed loop for this slice:

1. Child Agent receives compressed group memory context.
2. API microcompact native apply can be proven against adapter telemetry.
3. Telemetry must be fresh, native-request sourced, session/snapshot bound, and execution/runner bound.
4. Any weak proof gap becomes a main-Agent repair work item.
5. That repair work item is rendered back into child Agent memory context until strong proof is restored.
6. Once strong proof is restored, the open native repair work item closes automatically.

## Remaining Gaps

- Make repair work item claiming drive an actual main-Agent repair dispatch, not only sidecar materialization.
- Add a Memory Center UI panel specifically for native proof repair work item rows and closure reasons.
- Add cross-group aggregation so the global Agent can see which groups have weak native apply proof chains.
- Add a real third-party adapter replay test against an external child-Agent runner session, not only deterministic selftests.
