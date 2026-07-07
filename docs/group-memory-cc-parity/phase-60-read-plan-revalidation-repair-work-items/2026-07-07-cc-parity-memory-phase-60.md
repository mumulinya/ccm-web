# Phase 60 - Read Plan Revalidation Repair Work Items

## Objective

Upgrade CCM group memory toward Claude Code parity by turning compact read-plan revalidation failures into actionable main-Agent repair work items.

Phase 59 made wrong-session or missing current-source re-read receipts detectable. Phase 60 makes those failures usable: when a child Agent claims it re-read a stale compact read plan from the wrong session, Memory Center now materializes a sidecar repair work item and exposes it as a main-Agent dispatch candidate.

## Behavior

- Revalidation gaps from `compact_file_reference_read_plan_revalidation_gate` are synced into the existing replay repair work item ledger with source `compact_read_plan_revalidation_repair`.
- Session mismatches become `critical` repair work items.
- Missing current-source verification becomes `high` repair work items.
- Repair work items carry:
  - `revalidation_gate_id`
  - `read_plan_id`
  - `reference_id`
  - expected and receipt `task_agent_session_id`
  - expected and receipt `native_session_id`
  - `session_mismatch`
  - a prompt patch for the group main Agent.
- Dispatch candidates remain sidecar planning context only. They set `shouldCreateRealTask=false`; the group main Agent must explicitly claim, triage, or dispatch real child-Agent work.
- Once the bound child-Agent session provides a valid current-source verified receipt, the read-plan revalidation repair work item is auto-closed as `completed`.

## Source Isolation Fix

The shared replay repair work item ledger now has stricter source ownership.

`syncCompactBoundaryReplayRepairPendingWorkItems` only manages `compact_boundary_replay_repair` rows and preserves unrelated sources such as `compact_read_plan_revalidation_repair`. This prevents boundary replay sync from accidentally cancelling read-plan revalidation repair work items as stale replay actions.

This is important for Claude Code style memory recovery because several post-compact hooks can share a ledger, but each hook must close only the work it owns.

## Claude Code Parity Note

Claude Code-style compact recovery is not just "detect that context is stale"; it also needs a repair path after compaction. This phase adds that repair path for stale compact read-plan usage:

1. Detect changed compact source.
2. Require child Agent to re-read the current source.
3. Bind the proof to the exact child-Agent session.
4. Convert wrong or missing proof into main-Agent repair work.
5. Auto-close the repair work only after a valid bound-session receipt.

## Verification

Passed on 2026-07-07:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`
- `runMemoryCenterReplayRepairPendingWorkItemsSelfTest`
- `runMemoryCenterReplayRepairWorkItemClaimSelfTest`
- `runMemoryCenterReplayRepairDispatchCandidateSelfTest`

## Next Upgrade Direction

- Strengthen cross-group/global memory recall so multiple group chats can share global distilled facts without leaking unrelated group state.
- Add more automatic long-log distillation so repeated repair outcomes become typed memory, not only ledger rows.
- Continue toward finer micro-compact and partial compact behavior for large group histories.
- Add richer post-compact hook orchestration so each hook has its own source boundary, repair lifecycle, and main-Agent prompt contract.
