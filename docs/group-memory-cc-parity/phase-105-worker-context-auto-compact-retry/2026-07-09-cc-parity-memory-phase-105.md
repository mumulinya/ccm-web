# CCM Group Memory CC Parity - Phase 105

## Goal

Upgrade Phase 104's pre-dispatch hold into a Claude Code-style compact/rerender retry. When a WorkerContextPacket is `over_budget`, the group main Agent now attempts a deterministic compact retry before holding the child Agent dispatch.

## What Changed

- `backend/agents/runtime-kernel.ts`
  - Added `refreshWorkerContextPacketUsage`.
  - Added `context_compaction_retry` as a context usage category.
  - `renderWorkerContextPacket` now renders retry evidence.

- `backend/modules/collaboration/group-orchestrator.ts`
  - Added deterministic head/tail/critical-line compaction for oversized assignment tasks.
  - Added automatic retry path:
    - initial packet over budget
    - compact task while preserving ACK/receipt/proof/verification lines
    - rebuild WorkerContextPacket
    - recalculate `context_usage`
    - rebuild pre-dispatch gate
  - If retry recovers, assignment returns to `dispatchReady=true`.
  - If retry remains over budget, assignment stays held by the Phase 104 gate.
  - Generic assignment binding now persists `worker_context_packet_compaction_retry`.
  - Added `runWorkerContextCompactionRetrySelfTest`.

- `backend/modules/knowledge/memory-control-center.ts`
  - Added `worker_context_packet_compaction_retry` quality check.
  - Added Memory Center overview report and alerts for retry metadata.
  - Added `runMemoryCenterWorkerContextPacketCompactionRetrySelfTest`.

## Runtime Semantics

- Phase 104 still supports hard hold by setting `autoWorkerContextCompactRetry=false`.
- Default coded coordinator behavior now tries auto retry before hold.
- Retry status values:
  - `recovered`: initial packet was over budget, compacted packet is dispatch-ready.
  - `blocked`: retry happened but packet still cannot be dispatched.
- Retry must preserve:
  - ACK gate
  - `CCM_AGENT_RECEIPT`
  - replay repair ids and proof/request/session/runner identifiers
  - verification/acceptance contract

## Ledger Fields

Stored in `group-memory-replay-repair-dispatch-bindings/<group>.json`:

- `worker_context_packet_context_usage`
- `worker_context_pre_dispatch_gate`
- `worker_context_packet_compaction_retry`

Important retry fields:

- `from_usage_status`
- `retry_usage_status`
- `original_task_hash`
- `compacted_task_hash`
- `original_task_chars`
- `compacted_task_chars`
- `omitted_chars`
- `preserved_receipt_contract`
- `recovered_dispatch_ready`

## Why This Matters

Phase 103 created repair work items after pressure was detected. Phase 104 prevented over-budget packets from launching child Agent sessions. Phase 105 adds the missing recovery motion: try to shrink and rerender the packet first, then dispatch if the packet is safe. This is closer to Claude Code behavior around prompt-too-long recovery and retry.

## Validation

Passed:

```powershell
npm run build:backend
node -e "const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=m.runWorkerContextPreDispatchGateSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks,dispatchPolicy:r.dispatchPolicy},null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=m.runWorkerContextCompactionRetrySelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterWorkerContextPacketCompactionRetrySelfTest(); console.log(JSON.stringify(r,null,2)); process.exit(r.pass?0:1);"
node -e "const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=m.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass,assignmentCount:r.assignmentCount,executionOrder:r.executionOrder},null,2)); process.exit(r.pass?0:1);"
```

## Stable Memory

- `worker_context_packet_compaction_retry` proves that a pre-dispatch over-budget packet was compacted and rerendered.
- `recovered` retry may restore `dispatchReady=true`; `blocked` retry must keep the Phase 104 hold and Phase 103 repair path.
- Retry is deterministic and local; it does not claim semantic model summarization.
- Future phases should add model-backed memory-specific compaction before deterministic task truncation, especially for large `group_memory_rendered` and typed recall payloads.
