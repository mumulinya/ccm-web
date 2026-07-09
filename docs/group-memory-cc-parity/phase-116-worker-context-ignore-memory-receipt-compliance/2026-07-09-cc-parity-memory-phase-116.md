# Phase 116 - WorkerContextPacket Ignore Memory Receipt Compliance

## Goal

Close the Phase 115 loop. Phase 115 made `memory_policy.ignored=true` visible in WorkerContextPacket and required `CCM_AGENT_RECEIPT.memoryIgnored`. Phase 116 makes that requirement auditable and repairable: Memory Center now checks whether the child Agent actually declared `memoryIgnored`, whether the reason matches user-requested ignore semantics, and whether the receipt incorrectly claimed `memoryUsed`.

## What Changed

- Added `worker_context_packet_ignore_memory_receipt_compliance` quality check.
- Added receipt source collection for ignore-memory WorkerContextPacket bindings:
  - assignment binding embedded receipt,
  - task `receipt`,
  - task `delivery_summary.receipts` / `receipt_statuses`,
  - group message receipts,
  - replay repair timeline binding receipts.
- Matching supports packet id, assignment id, dispatch key, and target project fallback.
- Compliance requires:
  - `memory_ignored_receipt_required=true`,
  - `memory_reinjection_proof.status=ignored_by_policy`,
  - child receipt has `memoryIgnored`,
  - `memoryIgnored` mentions `user_requested_ignore_memory`, `must_not_use_group_memory`, or equivalent ignore-memory language,
  - no `memoryUsed` claim for historical/platform memory.
- Added `worker_context_packet_ignore_memory_receipt_repair_work_items`.
- Missing or weak ignore-memory receipts now create `worker_context_ignore_memory_receipt_repair` work items in the existing replay repair work item sidecar.
- When a compliant receipt appears, stale open repair items are marked completed with `worker_context_ignore_memory_receipt_compliant`.

## Why It Matters

Claude Code-style memory behavior is not only about injecting memory. It also needs disciplined non-use when the user asks for it. Without receipt compliance, CCM could ask a child Agent to ignore memory but never prove the child session obeyed.

This phase gives the main Agent a recovery loop:

- packet requires ignore-memory receipt,
- Memory Center audits the actual receipt,
- gaps become concrete repair work items,
- corrected receipts close the gap.

## Recovery Contract

- Ignore-memory receipt repair does not create real project work by itself.
- The repair item asks for a corrected `CCM_AGENT_RECEIPT`, not unrelated implementation changes.
- Corrected receipt must say memory was ignored by user request.
- Corrected receipt must not claim historical group/typed/global memory was used.
- Existing Memory Center work item queues and dispatch candidates can surface the repair.

## Validation

Passed:

- `npm run build:backend`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryReceiptComplianceSelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest`
- `runWorkerContextIgnoreMemoryPolicySelfTest`
- `runMemoryCenterWorkerContextPacketMemoryReinjectionProofSelfTest`
- `runMemoryCenterWorkerContextPacketContextUsageRepairWorkItemSelfTest`
- `npm run check`
- `npm run build`
- Final dist regression suite: 26 WorkerContextPacket / Memory Center selftests covering ignore-memory receipt compliance, ignore-memory policy, memory reinjection proof, context usage repair work items, PTL emergency, compact strategy memory, compact outcome ledger, partial compact policy, metadata partial retry, memory-first retry, compaction retry, pre-dispatch gate, usage budget, and runtime kernel.

## Follow-Up Direction

- Surface ignore-memory receipt compliance in the Memory Center UI as a separate state from missing memory.
- Distill recurring ignore-memory receipt failures into typed MEMORY.md feedback so future child Agent prompts get stricter receipt wording.
- Connect these repair items to automatic targeted rework prompts in the group main Agent.
