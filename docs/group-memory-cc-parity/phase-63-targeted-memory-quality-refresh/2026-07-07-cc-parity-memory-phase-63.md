# Phase 63 - Targeted Memory Quality Refresh

## Objective

Continue CCM memory toward Claude Code parity by making Memory Center quality diagnostics usable at single-check scope.

Phase 62 exposed a real scaling gap: a full `buildMemoryQualityReport({ refresh: true })` can be too heavy in a large workspace, even when the operator only needs to verify one memory path such as the child Global Agent memory bridge. Phase 63 adds targeted refresh so one check can be refreshed, audited, and inspected without forcing the whole Memory Center report to run.

## Behavior

`buildMemoryQualityReport` now accepts targeted check identifiers through these option names:

- `checkIds`
- `check_ids`
- `checks`
- `check`
- `id`

When any check id is supplied, the report becomes targeted:

- only requested known checks run
- unknown ids are returned in `unknownCheckIds`
- all supported ids are returned in `availableCheckIds`
- `targeted` and `requestedCheckIds` are included in the report
- `durationMs` is recorded
- the main quality cache is not overwritten unless `writeTargeted` or `write_targeted` is true
- audit records use `quality_report_targeted`

This keeps a small diagnostic path fast and safe while preserving the existing full quality report behavior for non-targeted runs.

## API

`/api/memory-center/quality` now supports targeted options on both GET and POST.

GET query parameters include:

- `checkIds`
- `check`
- `id`
- `ids`
- `refresh`
- `record`
- `writeTargeted`

POST merges JSON body options with query options, so UI and scripts can request a specific check while still using `refresh`, `record`, or cache controls.

## Self-Test

Added `runMemoryCenterQualityTargetedRefreshSelfTest`.

It verifies:

- targeted report only runs the requested check
- targeted report does not overwrite the main cached quality file
- available check ids are included
- unknown check ids are reported
- targeted duration is recorded

## Verification

Passed on 2026-07-07:

- `npm run check`
- `npm run build:backend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `npm run build:frontend`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- direct `buildMemoryQualityReport({ checkIds: ["child_global_agent_memory_bridge"], cacheMaxAgeMs: 0 })`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest`

The direct targeted command returned:

- `targeted: true`
- `checks: ["child_global_agent_memory_bridge"]`
- `unknown: []`
- `durationMs: 3307`

## Current Status

This phase closes the Phase 62 follow-up where full quality refresh could block one-check diagnostics.

The long-term Claude Code parity goal remains active. The memory system now has stronger compact boundaries, source manifests, read-plan revalidation, repair work items, Global Agent to child Agent context bridging, global/group arbitration, and targeted quality refresh. Remaining work should focus on making the system more autonomous and self-healing over long-lived real use.

## Next Upgrade Direction

- Add targeted refresh controls in the Memory Center frontend so operators can refresh one quality row from the UI.
- Add persistent arbitration ledgers so repeated global/group conflicts can be distilled into typed memory.
- Add cross-group duplicate suppression for repeated Global Agent memory items.
- Add long-run memory distillation jobs that convert recurring compact evidence into durable typed memory.
- Add stronger semantic contradiction detection beyond the current conservative newer-evidence heuristic.
