# CCM Group Memory CC Parity - Phase 103

## Goal

Upgrade WorkerContextPacket context usage from a visible budget ledger into a Claude Code-style reactive recovery path. When a child Agent handoff packet reaches `compact_recommended`, `critical`, or `over_budget`, Memory Center now materializes a group main Agent repair work item before the next child dispatch.

## What Changed

- `backend/agents/runtime-kernel.ts`
  - `buildWorkerContextUsage` now emits `suggested_reductions`.
  - Reduction hints point at the largest compressible context categories, such as `group_memory_rendered`, `typed_memory_recall`, `global_memory`, and `replay_repair_dispatch_briefs`.
  - `runWorkerContextUsageSelfTest` asserts the reduction field exists.

- `backend/modules/knowledge/memory-control-center.ts`
  - Added pressure detection for `ccm-worker-context-usage-v1`.
  - Added `worker_context_packet_context_usage_repair` work items in the existing replay repair work item ledger.
  - Added `worker_context_packet_context_usage_repair_work_items` quality check.
  - Added Memory Center overview alerts and report exposure.
  - Added `runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest`.

## Runtime Semantics

- Source ledger:
  - `group-memory-replay-repair-dispatch-bindings/<group>.json`
  - Field: `worker_context_packet_context_usage`

- Repair ledger:
  - `group-memory-replay-repair-work-items/<group>.json`
  - Source: `worker_context_packet_context_usage_repair`
  - Component: `worker_context_packet_context_pressure`

- Trigger statuses:
  - `compact_recommended`
  - `critical`
  - `over_budget`

- Repair instruction requires:
  - Compact or crop the packet before child Agent dispatch.
  - Preserve `task_goal`, `verification_and_acceptance`, and replay repair proof/request/session/runner identifiers.
  - Re-render WorkerContextPacket with `context_usage.status <= warn`.
  - Keep `free_tokens >= autocompact_buffer_tokens`.
  - Keep rendered `Context usage budget` visible.

## Why This Matters

Phase 102 made child Agent handoffs show a `/context`-style budget. Phase 103 makes that budget actionable: an over-budget packet is no longer only a warning; it becomes a main Agent-visible repair item and dispatch candidate. This follows the Claude Code direction where context pressure creates a recovery path instead of silently continuing with a risky prompt.

## Validation

Passed:

```powershell
npm run build:backend
node -e "const m=require('./ccm-package/dist/agents/runtime-kernel.js'); const r=m.runWorkerContextUsageSelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterWorkerContextPacketContextUsageSelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.buildMemoryQualityReport({checkIds:['worker_context_packet_context_usage_repair_work_items'], refresh:true}); console.log(JSON.stringify({status:r.status, checks:r.checks.map(c=>({id:c.id,status:c.status,checked:c.checked,passed:c.passed,gaps:(c.gaps||[]).length}))},null,2)); process.exit(r.unknownCheckIds&&r.unknownCheckIds.length?1:0);"
```

## Stable Memory

- WorkerContextPacket usage pressure is now a repair source, not only a diagnostic.
- The main Agent should treat `worker_context_packet_context_usage_repair` as a pre-dispatch compact/crop task.
- A current pressure item should remain open until the packet is regenerated below pressure.
- This repair item is diagnostic sidecar state; it does not automatically create real user tasks.
- Future phases can add automatic packet re-render gating so child Agent dispatch is paused or retried when `over_budget` remains unresolved.
