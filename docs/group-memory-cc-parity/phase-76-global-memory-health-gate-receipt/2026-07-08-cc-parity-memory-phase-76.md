# Phase 76 - Global Memory Health Gate Receipt

## Objective

Continue the CCM memory system toward Claude Code parity by closing the loop between child Agent context injection and child Agent receipts. Phase 75 added the Global Agent memory health gate to child context and worker handoff. Phase 76 makes that gate enforceable in child Agent result receipts and final delivery acceptance.

## Claude Code Reference

Relevant Claude Code reference points inspected:

- `D:\claude-code\src\commands\compact\compact.ts`
  - Runs microcompact before full compaction.
  - Runs pre-compact hooks and post-compact cleanup.
  - Clears context caches after compaction.
- `D:\claude-code\src\bootstrap\state.ts`
  - Tracks the first post-compaction API call with `pendingPostCompaction`.
  - Tracks invoked skills for preservation across compaction.
- `D:\claude-code\src\context.ts`
  - Loads CLAUDE.md / memory context into the API request.

The CCM equivalent direction is: context and memory sources must be injected, tracked through handoff, and then proven in child Agent receipts.

## What Changed

- Added Global Agent memory health gate receipt validation:
  - `collectTaskGlobalMemoryHealthGates()`
  - `evaluateReceiptGlobalMemoryHealthGate()`
  - `buildGlobalMemoryHealthGateVisibleSummary()`
- The validator extracts `global_memory_health_gate` from:
  - `worker_context_packet`
  - `worker_handoff`
  - task timeline events
  - assignment evidence
  - execution assignment context
- Child Agent receipt quality now hard-fails when:
  - a health gate is present but not mentioned,
  - a fail/blocking health gate is not referenced in `memoryIgnored`,
  - a blocked Global Agent memory context is still declared as used,
  - a warn gate is not acknowledged with residue/current-source verification.
- Delivery summary now exposes:
  - `global_memory_health_gates`
  - `global_memory_health_gate_count`
  - `global_memory_health_gate_receipt_passed`
  - `global_memory_health_gate_receipt_rows`
  - `global_memory_health_gate_summary`
- Acceptance gate now includes `global_memory_health_gate_receipt`.
- Runtime kernel now exposes `global_memory_health_gate`.
- Targeted rework now suggests a focused follow-up when the health gate receipt is missing or unsafe.
- Worker handoff and child Agent development contract now explicitly instruct third-party child Agents to reference `global_memory_health_gate` in `memoryUsed` / `memoryIgnored`.

## Safety Boundary

If `status=fail` or `action=block_global_agent_memory_recall`, the child Agent must not use Global Agent memory. Its receipt must mention the gate in `memoryIgnored`.

If `status=warn`, the child Agent must acknowledge residue warning or current-source verification before using Global Agent memory.

## Verification

Passed:

- `npm run build:backend`
- `runGlobalMemoryHealthGateReceiptValidationSelfTest`
- `runGlobalMemoryUsageReceiptValidationSelfTest`
- `runWorkerHandoffSelfTest`
- `runCollaborationUxSelfTest`
- `node scripts\main-agent-decision-ui-selftest.mjs`
- `npm run check`

Final Global Agent selftest contamination scan:

```json
{
  "pass": true,
  "status": "ok",
  "active": 0,
  "residue": 0
}
```

## Files Touched

- `backend/modules/collaboration/collaboration.ts`
- `backend/agents/worker-handoff.ts`
- `scripts/main-agent-decision-ui-selftest.mjs`
- generated backend dist files under `ccm-package/dist`

## Next Direction

Continue toward Claude Code parity by proving the same receipt discipline end-to-end on real third-party child Agent sessions:

- dispatch a child Agent with a full memory bundle,
- persist its task Agent session binding,
- collect the native session receipt,
- verify memory usage/ignore rows against the exact injected context,
- replay the same flow after compact / post-compact reinjection.
