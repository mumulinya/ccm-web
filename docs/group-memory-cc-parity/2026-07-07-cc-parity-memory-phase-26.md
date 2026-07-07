# Phase 26 - Memory Gate Receipt Validation

## Goal

Upgrade Phase 25 from "child Agents are told to declare memory gate usage" to "CCM validates that child Agent receipts actually reference the memory dispatch gate", so group memory usage becomes enforceable in the main Agent completion gate.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\utils\hooks.ts`
  - `D:\claude-code\src\services\compact\postCompactCleanup.ts`
  - `D:\claude-code\src\commands\clear\caches.ts`
- Claude Code behavior mirrored:
  - Loaded instructions have explicit reload evidence.
  - Context/cache reload events should be auditable, not only prompt text.
  - Consumers should be able to explain whether a context reload was used or intentionally bypassed.

## Implementation

- Added gate extraction helpers in `backend/modules/collaboration/collaboration.ts`:
  - `extractMemoryDispatchFreshnessGateFromValue(value)`
  - `collectTaskMemoryDispatchFreshnessGates(task, context)`
  - `evaluateReceiptMemoryDispatchGate(task, receipt, context)`
- Gate extraction now searches:
  - `task.mission_handoff`
  - `task.worker_context_packet`
  - `task.workflow_timeline[*].data.worker_context_packet`
  - `task.workflow_timeline[*].data.worker_handoff`
  - assignment evidence worker packets
  - execution assignments
- `scoreChildAgentReceipt()` now includes a hard gate-aware check:
  - check id: `memory_gate`
  - label: `引用记忆派发 gate`
  - if a matching `dispatch_gate_id` exists for that Agent, the receipt must mention it in `memoryUsed` or `memoryIgnored`
  - missing gate reference caps score at `70` and prevents grade `good`
- `buildDeliverySummary()` now records:
  - `memory_dispatch_gates`
  - `memory_dispatch_gate_count`
  - `memory_gate_receipt_passed`
  - `memory_gate_receipt_rows`
- `buildAcceptanceGate()` now has a first-class check:
  - check id: `memory_gate_receipt`
  - label: `记忆 gate 回执`
  - blocks final acceptance when a memory dispatch gate exists but the child receipt does not reference it
- This makes memory usage enforcement part of the same completion gate that already checks files, verification, ACK, contract injection, and final review.

## Selftests

- Added `runMemoryDispatchGateReceiptValidationSelfTest()`.
- The selftest verifies:
  - a receipt with `memoryUsed: ["...dispatch_gate_id=gmd_receipt_gate_selftest..."]` passes as `good`;
  - a receipt with `memoryIgnored` can also satisfy the gate when it references the gate id;
  - a receipt that generally says it used memory but omits the gate id is downgraded to `partial`;
  - missing gate id appears in `memory_gate.missing_gate_ids`;
  - `buildDeliverySummary()` records the missing gate evidence;
  - `acceptance_gate.failed_checks` includes `memory_gate_receipt`;
  - a good receipt keeps `memory_gate_receipt_passed === true`.

## Operational Memory

- Phase 25 made child Agent dispatches carry `dispatch_freshness_gate`.
- Phase 26 makes the main Agent verify the child Agent consumed or explicitly ignored that gate.
- This closes an important loop for third-party Agent sessions: CCM no longer relies on the child Agent merely seeing prompt instructions; completion quality now depends on receipt evidence that ties the child Agent's output back to the injected group memory context.
- The validator is scoped by target project, so multiple group members can have separate memory gates in the same task.
- If a task has no memory dispatch gate, existing receipt quality behavior remains compatible.

## Still Open

- The UI still needs a dedicated memory gate status column or panel.
- Receipt validation currently checks for the exact gate id string; later phases can add structured `memoryGateIds` fields to the receipt schema.
- Runtime lifecycle cards expose worker packet ids but do not yet surface `memory_gate_receipt` as a first-class runtime badge.
- File watcher driven cache invalidation remains future work.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - `runMemoryDispatchGateReceiptValidationSelfTest()`
  - `runCollaborationProtocolSelfTest()`
  - `runCollaborationUxSelfTest()`
  - full dist memory regression including `receiptGate`

Dist regression result after backend build:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "externalApproval": true,
  "settingSource": true,
  "instructionsHook": true,
  "sourceChangeReload": true,
  "dispatchFreshnessGate": true,
  "receiptGate": true,
  "workerHandoff": true,
  "reloadAudit": true,
  "distill": true,
  "distillQuality": true,
  "sourceManifest": true,
  "context": true,
  "globalContext": true,
  "warning": true,
  "preserved": true,
  "audit": true,
  "timeBased": true,
  "partial": true,
  "sidecar": true,
  "ptl": true,
  "recovery": true,
  "micro": true,
  "hook": true,
  "quality": true,
  "integration": true,
  "auto": true
}
```
