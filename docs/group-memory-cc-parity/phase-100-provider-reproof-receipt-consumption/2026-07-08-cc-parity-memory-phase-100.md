# Phase 100 - Provider Re-proof Receipt Consumption

## Goal

Continue the CCM memory parity work from "provider re-proof brief is injected into the child Agent context" to "the child Agent receipt declares how that injected brief was consumed".

This matters because Claude Code-style memory is not only preserved and re-injected; it is also auditable after each fresh Agent session. A child Agent must say whether it used, verified, ignored, blocked on, or claimed strong handling of the injected replay repair brief.

## Changes

- Added receipt schema field:
  - `replayRepairDispatchBriefUsage`
- Updated worker handoff rendering so child Agents are explicitly instructed to reference:
  - `briefId`
  - `workItemId`
  - `usageState`
  - `providerReproofStatus`
  - `requestPatchChecksum`
  - `runnerRequestId`
- Updated `WorkerContextPacket` rendering to require `replayRepairDispatchBriefUsage` for replay repair briefs.
- Preserved provider re-proof metadata in collaboration timeline refs:
  - `provider_reproof_status`
  - `provider_reproof_reason`
  - `reproof_candidate_id`
  - `timeline_binding_id`
  - `original_work_item_id`
- Extended replay repair timeline binding persistence to classify receipt consumption from:
  - `receipt.replayRepairDispatchBriefUsage`
  - fallback `memoryUsed`
  - fallback `memoryIgnored`
  - fallback blockers/needs
- Added persisted timeline binding fields:
  - `replay_repair_consumption_status`
  - `replay_repair_consumption_reason`
  - `replay_repair_consumption_source`
  - `replay_repair_consumption_state`
- Added Memory Center report/check:
  - `api_microcompact_native_apply_proof_repair_receipt_consumption`
- Added selftest:
  - `runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionSelfTest`

## Semantics

Consumption status is an audit of the child Agent receipt, not provider strong proof.

- `used`, `verified`, `ignored`, and `blocked` describe how the child Agent handled the injected brief.
- `strong` may be recorded as a receipt claim, but it still does not close provider re-proof work by itself.
- Provider re-proof work items still require real native provider strong proof:
  - native request adapter telemetry
  - request/session/snapshot/execution/runner binding
  - `nativeApplyStrongProof=true`

## Validation

- `npm run build:backend` passed.
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionSelfTest` passed.
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest` still passed.
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest` still passed.

## Parity Impact

The provider re-proof chain now has an auditable consumption layer:

1. provider re-proof work item exists
2. work item becomes dispatch candidate
3. candidate becomes brief
4. brief enters assignment and `WorkerContextPacket`
5. child Agent receipt declares `replayRepairDispatchBriefUsage`
6. timeline binding stores the consumption status
7. Memory Center reports whether receipt consumption is covered
8. provider re-proof remains open until native provider strong proof exists

## Remaining Direction

Next upgrades should feed successful consumption outcomes into long-term typed memory:

- distill repeated `used/verified` repair outcomes into typed MEMORY.md-style group memory
- suppress `ignored/blocked` repair rows from automatic high-priority recall unless the next task matches
- add a child session recall audit showing current compressed memory, provider re-proof packet, and receipt consumption in one row
