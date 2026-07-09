# CCM Group Memory CC Parity - Phase 104

## Goal

Move WorkerContextPacket context pressure handling from post-hoc diagnostics into a pre-dispatch gate. If a child Agent handoff packet is already `over_budget`, the group main Agent must hold the dispatch, persist a gate ledger entry, and let Memory Center materialize the Phase 103 repair work item.

## What Changed

- `backend/agents/runtime-kernel.ts`
  - `buildWorkerContextPacket` accepts internal `contextUsageOptions`.
  - Normal production behavior still defaults to a 90k token context budget.

- `backend/modules/collaboration/group-orchestrator.ts`
  - Every coded assignment now gets `worker_context_pre_dispatch_gate`.
  - Every WorkerContextPacket assignment writes a generic binding entry:
    - source: `worker_context_packet_pre_dispatch_gate`
    - ledger: `group-memory-replay-repair-dispatch-bindings/<group>.json`
  - `over_budget` assignments are marked:
    - `dispatchReady=false`
    - `status=blocked`
    - `must_repair_before_dispatch=true`
    - `repair_source=worker_context_packet_context_usage_repair`
  - Coded coordinator output switches dispatch policy to `hold` when any assignment is blocked by the context gate.

- `backend/modules/collaboration/collaboration.ts`
  - Structured assignment extraction now respects `dispatchReady=false`.
  - If all structured assignments are blocked by pre-dispatch gates, the fallback text mention parser is not used. This prevents an `@project` text line from bypassing the gate.

- `backend/modules/knowledge/memory-control-center.ts`
  - Added `worker_context_packet_pre_dispatch_gate` quality check.
  - Added Memory Center overview report and alert exposure.
  - Added `runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest`.

## Runtime Semantics

- `compact_recommended` and `critical` are warnings.
- `over_budget` is a hard pre-dispatch hold.
- The hold does not delete the assignment. It keeps the planned assignment visible to the main Agent/UI while preventing immediate third-party child Agent launch.
- The same binding is still consumed by Phase 103:
  - `worker_context_packet_context_usage_repair_work_items`
  - source: `worker_context_packet_context_usage_repair`

## Why This Matters

Phase 103 made over-budget packets actionable after Memory Center scans them. Phase 104 makes the coordinator aware before dispatch: a fresh child Agent session should not be started with a packet that already exceeds the budget. This is closer to Claude Code's prompt-too-long/reactive compact behavior, where context pressure creates a recovery path before retrying work.

## Validation

Passed:

```powershell
npm run build:backend
npm run check
node -e "const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=m.runWorkerContextPreDispatchGateSelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterWorkerContextPacketPreDispatchGateSelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.buildMemoryQualityReport({checkIds:['worker_context_packet_pre_dispatch_gate','worker_context_packet_context_usage_repair_work_items'], refresh:true}); console.log(JSON.stringify({status:r.status,unknown:r.unknownCheckIds,checks:r.checks.map(c=>({id:c.id,status:c.status,checked:c.checked,passed:c.passed,gaps:(c.gaps||[]).length}))},null,2)); process.exit((r.unknownCheckIds||[]).length?1:0);"
node -e "const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=m.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass,assignmentCount:r.assignmentCount,executionOrder:r.executionOrder,contentHasPlan:r.contentHasPlan},null,2)); process.exit(r.pass?0:1);"
```

## Stable Memory

- `worker_context_packet_pre_dispatch_gate` is the authoritative pre-dispatch gate for WorkerContextPacket budget pressure.
- `over_budget` must set `dispatchReady=false` and must point to `worker_context_packet_context_usage_repair`.
- Mention extraction must not bypass blocked structured assignments.
- This phase still does not auto-compact and retry by itself; it creates the hold and proof ledger. A future phase should add automatic compact-and-rerender retry for held packets.
