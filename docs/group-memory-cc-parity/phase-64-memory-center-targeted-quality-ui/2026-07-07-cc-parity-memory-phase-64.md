# Phase 64 - Memory Center Targeted Quality UI

## Objective

Continue CCM memory toward Claude Code parity by turning the Phase 63 targeted quality refresh API into an operator-visible Memory Center workflow.

Phase 63 made single-check diagnostics possible in the backend. Phase 64 closes the usability loop: a user can now refresh one Memory Center quality card without running the full quality report and without losing the surrounding report context.

## Behavior

Each quality check card in `MemoryCenter.vue` now has a compact refresh control.

When a single card is refreshed:

- the frontend calls `/api/memory-center/quality` with `checkIds: [checkId]`
- the request uses `POST` with `refresh: true` and `record: true`
- the returned targeted report is merged back into the existing quality report
- only the refreshed check card is replaced
- other quality checks remain visible
- the visible aggregate score is recomputed from the current displayed checks
- the main quality cache is still protected by the Phase 63 backend default because the UI does not request `writeTargeted`
- the panel records `lastTargetedRefresh` so the latest targeted diagnostic is visible in the score block

This keeps the heavy full refresh path available while making narrow memory diagnostics practical for large workspaces.

## Files

- `frontend/src/components/knowledge/MemoryCenter.vue`

## Verification

Passed on 2026-07-07:

- `npm run build:frontend`
- `npm run check`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- static Memory Center UI contract check:
  - `quality-refresh-btn` exists
  - targeted request sends `checkIds: [checkId]`
  - targeted reports use `mergeTargetedQualityReport`
  - merged reports record `lastTargetedRefresh`

## Current Status

The targeted quality refresh path is now usable end-to-end:

1. Memory Center shows quality checks.
2. A single check can be refreshed from its card.
3. Backend runs only that requested check.
4. Frontend merges the result without collapsing the full report.
5. Audit can record the targeted quality run.

The long-term Claude Code parity goal remains active. This phase strengthens the "memory can be scored and repaired without forcing a huge context refresh" part of the system.

## Next Upgrade Direction

- Persist global/group arbitration conflicts into a ledger so repeated conflicts can be distilled into durable typed memory.
- Add cross-group duplicate suppression for repeated Global Agent memory items in child Agent packets.
- Add long-run distillation jobs that convert recurring compact evidence and quality gaps into typed memory candidates.
- Add stronger contradiction detection so arbitration can move beyond conservative token overlap.
