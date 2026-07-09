# Phase 115 - WorkerContextPacket Ignore Memory Policy

## Goal

Make `ignore memory` a first-class WorkerContextPacket policy instead of an ambiguous absence of memory. A child Agent session may start fresh for every task, so when the user explicitly asks CCM to ignore memory, the project child Agent must receive a visible protocol packet saying memory is intentionally ignored, not missing, and must provide a `memoryIgnored` receipt.

## What Changed

- `WorkerContextPacket` now carries `memory_policy` with schema `ccm-worker-context-memory-policy-v1`.
- The runtime normalizes user-requested ignore semantics into:
  - `ignored: true`,
  - `use: must_not_use_group_memory`,
  - `reason: user_requested_ignore_memory`,
  - `receipt_required: true`.
- WorkerContextPacket rendering now exposes `Memory policy：ignored` and requires `CCM_AGENT_RECEIPT.memoryIgnored`.
- `memory_reinjection_proof.status` now uses `ignored_by_policy` for intentional memory suppression.
- Context usage now includes a `memory_policy` category so the policy instruction is budgeted and auditable.
- Assignment bindings persist:
  - `worker_context_packet_memory_policy`,
  - `worker_context_packet_acceptance`,
  - render flags for `has_memory_policy` and `has_memory_ignored_policy`.
- Memory Center now validates `worker_context_packet_ignore_memory_policy`.
- Memory Center reinjection proof checks now accept `ignored_by_policy` as a legitimate proof state instead of treating it as memory loss.
- Metadata partial compact regression tests can explicitly disable compact strategy memory when validating pure usage-top-category behavior.

## Why It Matters

Claude Code-style memory behavior needs both recall and intentional non-recall. Without this phase, a third-party child Agent could see no memory and fail to distinguish these cases:

- there is no memory available,
- memory injection failed,
- the user explicitly requested memory not be used.

Phase 115 closes that ambiguity. The system still sends a small policy/protocol context, but it does not send historical memory as usable context.

## Ignore Contract

- Historical group memory, typed MEMORY.md recall, and global memory must be treated as empty for the current WorkerContextPacket.
- The child Agent can use only current task text, current user-provided content, and fresh inspection evidence.
- The packet must require `memoryIgnored` in the child receipt.
- `ignored_by_policy` is only valid for intentional user-requested ignore semantics.
- Normal memory injection remains unchanged when `memory_policy.ignored !== true`.
- Pre-dispatch gate, compact retry, PTL emergency downgrade, and context usage accounting still run normally.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextIgnoreMemoryPolicySelfTest`
- `runMemoryCenterWorkerContextPacketIgnoreMemoryPolicySelfTest`
- `runWorkerContextPtlEmergencyDowngradeSelfTest`
- `runWorkerContextCompactStrategyMemorySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runWorkerContextUsageSelfTest`
- `runAgentRuntimeKernelSelfTest`
- `npm run check`
- `npm run build`
- Final dist regression suite: 24 WorkerContextPacket / Memory Center selftests covering ignore-memory, PTL emergency, compact strategy memory, compact outcome ledger, partial compact policy, partial compaction retry, memory-first retry, compaction retry, pre-dispatch gate, context usage, memory reinjection proof, usage budget, and runtime kernel.

## Follow-Up Direction

- Add typed MEMORY.md entries for recurring ignore-memory requests so future sessions can preserve the policy without recalling historical content.
- Add UI evidence in Memory Center showing ignored memory packets separately from missing memory packets.
- Add receipt-consumption scoring for `memoryIgnored` so repeated noncompliance can create repair work items.
