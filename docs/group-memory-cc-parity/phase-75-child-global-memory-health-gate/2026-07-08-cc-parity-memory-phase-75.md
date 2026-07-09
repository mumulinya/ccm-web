# Phase 75 - Child Global Memory Health Gate

## Objective

Upgrade the CCM group memory pipeline so project child Agents and third-party child Agent sessions only receive Global Agent memory after a health gate confirms active Global Agent memory is clean. This keeps the Claude Code parity memory direction focused on safe recall, compacted context reuse, and child-agent handoff discipline.

## What Changed

- Added `buildChildGlobalAgentMemoryHealthGate()` in the collaboration memory module.
- The child Global Agent memory context now scans active and residue selftest contamination before recall.
- Active contamination fails closed:
  - Global Agent memory recall is blocked.
  - The rendered child context says the global memory must not be used.
  - No contaminated preview is injected into the child Agent context.
  - Receipt expectations require memoryIgnored to reference the gate.
- Residue-only contamination warns without blocking active memory.
- Clean active memory allows normal Global Agent recall.
- A test-only bypass was added for historical selftest fixtures that intentionally write `source: "selftest"` memory.
- The self-contained worker handoff now preserves and renders `global_memory_health_gate`.
- Memory Center child Global Agent bridge diagnostics pass the same selftest bypass only from selftests.

## Safety Boundary

The bypass is explicit and only wired into selftests. Production child Agent context generation still blocks Global Agent memory when active contamination is detected.

The gate is included in:

- `global_agent_memory.memory_health_gate`
- top-level context bundle `global_memory_health_gate`
- rendered group memory context
- worker handoff references and rendered handoff context

## Verification

Passed:

- `npm run build:backend`
- `runGroupGlobalAgentMemoryHealthGateSelfTest`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runWorkerHandoffSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`
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

- `backend/modules/collaboration/memory.ts`
- `backend/agents/worker-handoff.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/main-agent-decision-ui-selftest.mjs`
- generated backend dist files under `ccm-package/dist`

## Next Direction

Continue toward Claude Code parity by strengthening how compacted memory is selected and re-injected after context pressure. The next likely upgrades are:

- stronger per-child-agent recall receipts for global memory usage and ignored memory,
- automatic downgrade or quarantine when the health gate repeatedly fails,
- typed `MEMORY.md` reconciliation between group memory and Global Agent memory,
- post-compact replay tests that prove third-party child Agent sessions receive the correct memory bundle on first dispatch.
