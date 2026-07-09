# Phase 119 - Ignore-Memory Corrected Receipt Dispatch Briefs

## Goal

Continue the long-running CCM memory upgrade toward Claude Code parity by closing the next ignore-memory repair loop.

Phases 115-118 added ignore-memory policy, compliance auditing, repair work items, Memory Center UI, and manual repair actions. This phase proves those repair items can become main-Agent dispatch candidates and corrected-receipt worker briefs, without accidentally re-injecting memory that the user asked to ignore.

## Changed

- Added dispatch candidate metadata for ignore-memory receipt repair items:
  - `worker_context_packet_id`,
  - packet binding id,
  - assignment id,
  - dispatch key,
  - memory policy reason.
- Added Memory Center quality check:
  - `worker_context_packet_ignore_memory_receipt_repair_dispatch_candidates`
- Added Memory Center quality check:
  - `worker_context_packet_ignore_memory_receipt_repair_dispatch_briefs`
- Corrected coordinator worker-brief wording for ignore-memory repair:
  - it must not re-inject group / typed / global memory,
  - it asks only for a corrected `CCM_AGENT_RECEIPT.memoryIgnored`,
  - `memoryUsed` must not claim historical memory use.
- Preserved the source packet metadata through coordinator brief creation and assignment binding.
- Extended the Memory Center ignore-memory panel to show candidate and brief counts, packet-bound coverage, and corrected-prompt coverage.
- Added selftest:
  - `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest`

## Files

- `backend/modules/knowledge/memory-control-center.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/agents/runtime-kernel.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- Generated build output under:
  - `ccm-package/dist/**`
  - `ccm-package/public/**`

## Validation

- `npm run build:backend` passed.
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptRepairDispatchSelfTest` passed.
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest` passed.
- `runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest` passed.
- `npm --prefix frontend run build` passed.
- `npm run check` passed.

## Long-Term Memory Note

Ignore-memory repair now has a full audited path from detected child-Agent receipt failure to main-Agent corrected-receipt dispatch brief. This is closer to Claude Code style session hygiene because every fresh third-party child-Agent session can receive a self-contained, policy-safe repair instruction while preserving the user instruction to ignore platform memory.

The long-term goal remains active. Remaining directions include repeated-failure typed MEMORY.md distillation, automatic corrected-receipt rework routing, and broader proof that all child-Agent session types consume these repair briefs consistently.
