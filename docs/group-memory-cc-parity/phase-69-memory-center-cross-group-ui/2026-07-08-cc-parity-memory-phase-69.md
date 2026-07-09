# Phase 69 - Memory Center Cross-Group Global Memory UI

## Objective

Continue CCM memory toward Claude Code parity by making cross-group Global Agent memory suppression visible and operable in Memory Center.

Phases 67 and 68 added hard suppression and freshness-aware advisory rows for Global Agent memories that conflict across groups. Phase 69 exposes those rows in the UI so a group main Agent operator can see whether a recalled global memory was actively suppressed, merely advisory, superseded by a newer global update, or missing source evidence.

## Claude Code Reference

Relevant Claude Code behavior inspected in `D:\claude-code`:

- compact and memory transitions are auditable state boundaries, not hidden one-shot text transforms
- memory is scoped and injected deliberately into child Agent context
- after compaction, the system must retain enough source evidence to explain why a memory is used, downgraded, or excluded

The Phase 69 CCM change follows that direction by turning cross-group arbitration into an inspectable Memory Center surface.

## Behavior

Memory Center now renders a `跨群聊全局记忆` panel when either cross-group quality check is available:

- `global_memory_cross_group_suppression`
- `global_memory_cross_group_suppression_freshness`

The panel includes targeted refresh buttons for both checks and summary cards for:

- `hard`
- `advisory`
- `superseded`
- `missing`

The row table merges:

- `crossGroupSuppressionItems` as hard suppression rows
- `crossGroupSuppressionAdvisoryItems` as advisory freshness rows

Each row shows the Global Agent memory id, group id, target project, conflict group count, occurrence count, action/status, source ledger count, and freshness state.

## UI State Semantics

Rows are classified as:

- `fail` for hard suppression
- `ok` for advisory rows superseded by newer Global Agent memory
- `warn` for decayed advisory rows
- `waiting` for advisory rows that still require operator attention

This makes the Memory Center view match the child Agent context semantics introduced in Phase 68.

## Quality Guard

`scripts/main-agent-decision-ui-selftest.mjs` now verifies that Memory Center renders the cross-group global memory quality panel and checks for both hard and advisory row normalization.

The selftest specifically guards:

- merged `crossGroupQualityRows`
- `cross-group-quality-panel`
- both targeted quality check ids
- hard row normalization
- advisory row normalization
- `crossGroupSuppressionAdvisoryItems`

## Incidental Build Fix

During verification, `npm run build:backend` and `npm run check` were blocked by an existing TypeScript issue in `backend/test-agent/execution-plan.ts`.

The fix uses a union-safe `"path" in issue` guard before carrying an optional issue path into the execution plan. This does not change runtime behavior; it only restores TypeScript correctness for `WorkOrderIssue | TestAgentContractIssue`.

## Verification

Passed on 2026-07-08:

- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run build:frontend`
- `npm run build:backend`
- `npm run check`
- `npm run test:chat-experience`

## Current Status

Phase 69 is complete. CCM now has a visible Memory Center control surface for cross-group Global Agent memory suppression, advisory freshness, source-ledger diagnosis, and targeted refresh.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add semantic contradiction scoring beyond keyword/newer-message heuristics.
- Add periodic background maintenance to prune test/stale arbitration ledger rows.
- Add child-Agent receipt feedback so a third-party child Agent can confirm whether advisory global memory was used, ignored, or verified.
- Add replay coverage that proves cross-group UI rows remain available after compact/reload boundaries.
