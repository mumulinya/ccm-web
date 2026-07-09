# Phase 99 - Provider Re-proof WorkerContextPacket Injection

## Goal

Continue the long-running CCM memory parity work toward Claude Code-style memory compression and reuse by closing the gap between provider re-proof repair planning and the actual child-Agent context packet.

Before this phase, provider re-proof work items could become dispatch candidates, dispatch briefs, assignment bindings, and timeline bindings. The missing proof was narrower but important: Memory Center could not verify that the provider re-proof metadata was actually injected into the `WorkerContextPacket` rendered for a fresh third-party child-Agent session.

## Changes

- Extended `buildWorkerContextPacket` so replay repair briefs carry provider re-proof metadata:
  - `provider_reproof_status`
  - `provider_reproof_reason`
  - `reproof_candidate_id`
  - `timeline_binding_id`
  - `original_work_item_id`
  - `execution_id`
- Updated `renderWorkerContextPacket` to render the same provider re-proof/request/session/dispatch/runner/execution fields that a child Agent must see.
- Updated replay repair assignment binding persistence so it records:
  - the injected `worker_context_packet_replay_briefs`
  - a `worker_context_packet_render_probe`
  - rendered flags proving the brief id, work item id, provider re-proof fields, original work item, request checksum, runner id, and execution id were visible in the child-Agent packet.
- Added Memory Center report/check:
  - `api_microcompact_native_apply_proof_repair_worker_context_packet_injection`
  - verifies native/provider proof repair assignment bindings are mirrored into `WorkerContextPacket`
  - verifies provider re-proof metadata is present in both structured packet data and rendered text
  - exposes packet brief counts, provider packet counts, rendered provider counts, and metadata gaps.
- Added selftest:
  - `runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest`

## Validation

- `npm run build:backend` passed.
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest` passed.
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest` still passed, preserving Phase 98 semantics:
  - provider re-proof metadata flows through dispatch/timeline
  - timeline closure does not prematurely complete provider re-proof work items.
- Targeted Memory Quality descriptor recognizes:
  - `api_microcompact_native_apply_proof_repair_worker_context_packet_injection`

## Parity Impact

This phase moves the system closer to Claude Code-style memory use by proving that compressed/repaired group memory is not only planned by the coordinator, but is also injected into the child Agent's actual context packet for each fresh session.

The provider re-proof chain is now:

1. timeline-closed native proof repair creates provider re-proof candidate
2. candidate materializes provider re-proof work item
3. work item becomes dispatch candidate
4. dispatch candidate becomes ready brief
5. brief attaches to assignment
6. assignment persists `WorkerContextPacket` injection evidence
7. child session timeline can bind back to task/session/snapshot/execution/receipt
8. provider re-proof remains open until real native provider strong proof exists

## Remaining Direction

The next upgrade should move from packet injection proof to recall/consumption proof:

- record which child-Agent sessions consumed a provider re-proof packet as strong, weak, ignored, or blocked
- feed successful provider re-proof outcomes into typed long-term group memory / MEMORY.md-style documents
- add a recall audit showing which fresh child-Agent sessions received the current compressed group memory and which stale entries were suppressed
