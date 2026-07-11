# Phase 154 - Provider Dispatch Override Follow-up Receipt Validation Typed Policy

## Goal

Persist every Phase 152/153 corrected-receipt validation attempt as typed group memory and feed that history into the next provider-specific pre-dispatch decision.

Repeated invalid corrected receipts for the same `agentType + project` must escalate a provider from receipt sampling to a hard pre-dispatch hold. A later fully verified receipt must clear only the active failure streak, return the provider to monitored sampling, and preserve every failed attempt for audit and future child-Agent sessions.

## Implemented

- Added an append-only typed-memory archive:
  - `pressureProvenanceProviderDispatchOverrideFollowupReceiptValidationArchive`
  - schema: `ccm-pressure-provenance-provider-dispatch-override-followup-receipt-validation-distillation-v1`
- Added automatic distillation at the coordinator validation write boundary:
  - `distillProviderDispatchOverrideFollowupReceiptValidationToTypedMemory(...)`
  - every failed or passed validation is archived before the binding ledger stores its latest state
  - distillation failure is recorded on the validation without losing the binding result
- Added feedback typed memory document:
  - `provider-dispatch-override-followup-receipt-validation-history.md`
- Each archived attempt preserves:
  - validation, binding, assignment, packet, task, session, and execution ids
  - `agentType + project`
  - failed/passed status and timestamp
  - validation repair work item
  - required rel paths, follow-up work items, and provider override ids
  - gap codes/reasons and receipt evidence reasons
  - provenance row and current-source verification counts
- Each attribution computes:
  - total/failed/passed attempt counts
  - current consecutive failure count
  - latest validation status
  - last failed/passed timestamps
  - verified repair state
  - accumulated validation/work-item/evidence ids
- Extended `buildPressureProvenancePreDispatchComplianceDispatchPolicy(...)`:
  - default corrected-receipt failure threshold: `2`
  - threshold can be configured with `providerOverrideFollowupReceiptValidationFailureThreshold`
  - repeated failures set `provider_override_followup_receipt_validation_escalated=true`
  - verified repair sets `provider_override_followup_receipt_validation_repair_verified=true`
  - validation-only history can create a provider policy row even when no older pressure violation row exists
- Extended provider advisory and decision evidence with validation attempt/streak/repair metadata.
- Extended WorkerContextPacket rendering with corrected-receipt validation history.
- Dispatch state transition:
  - two consecutive failures: `critical -> hold_until_repair -> dispatch_ready=false`
  - verified corrected receipt: `monitor -> allow_with_receipt_sampling -> dispatch_ready=true`
- A verified repair regenerates the next-session repaired-history receipt contract from archived rel paths, work item ids, and override ids.
- Added Memory Center report and quality check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_typed_memory_policy`
- Memory Center verifies archive completeness, MEMORY.md document presence, recall coverage, latest binding validation coverage, and provider policy consumption.
- Added system/group alerts for uncovered typed-memory or policy links.
- Added selftests:
  - `runWorkerContextProviderDispatchOverrideFollowupReceiptValidationPolicySelfTest()`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationTypedMemoryPolicySelfTest()`

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- `npm run build`: pass
- Phase 154 coordinator policy/gate selftest: pass
- Phase 154 Memory Center archive/recall/policy selftest: pass
- Phase 137-154 plus core memory regression: 35/35 pass
  - provider recovery, relapse, advisory, gate, decision, override, follow-up, receipt contract, validation, and repair
  - pressure-memory recall and repair recall
  - ignore-memory policy
  - pre-dispatch gate and compaction retry
  - runtime packet usage/rendering and worker handoff

Escalated state after two failed attempts:

```json
{
  "action": "hold_provider_after_repeated_override_followup_receipt_validation_failures",
  "health_status": "critical",
  "dispatch_policy": "hold_until_repair",
  "dispatch_ready": false,
  "consecutive_failure_count": 2
}
```

Repaired state after the third attempt passes:

```json
{
  "action": "monitor_repaired_provider_override_followup_receipt_validation",
  "health_status": "monitor",
  "dispatch_policy": "allow_with_receipt_sampling",
  "dispatch_ready": true,
  "attempt_count": 3,
  "failed_count": 2,
  "passed_count": 1,
  "consecutive_failure_count": 0,
  "repair_verified": true
}
```

## Stable Memory

The binding ledger remains the source of the latest validation state, but it is no longer the only historical source. Every corrected-receipt attempt is appended to typed group memory before the latest binding state is written, so a newly created third-party child-Agent session can recover the complete failure and repair history through MEMORY.md recall.

Provider enforcement uses the current consecutive failure streak, not lifetime failure count. A verified repair resets the active streak and restores monitored receipt sampling, but it never deletes or rewrites earlier failed attempts. This separates operational recovery from audit retention.

The default escalation threshold is two consecutive failed corrected receipts for the same `agentType + project`. At threshold, the group main Agent must not launch that provider until a complete receipt satisfies rel-path, work-item, override-id, current-source, and repaired-history verification requirements.

## Next Direction

The next upgrade should add time-aware confidence decay and cross-group provider-risk aggregation. Recent failures should carry more dispatch weight than old repaired attempts, while global Agent guidance may share provider reliability signals across groups without leaking group-private memory content or overriding each group's local policy.
