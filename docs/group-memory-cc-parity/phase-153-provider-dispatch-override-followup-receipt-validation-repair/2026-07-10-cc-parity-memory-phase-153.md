# Phase 153 - Provider Dispatch Override Follow-up Receipt Validation Repair

## Goal

Turn a failed Phase 152 provider-dispatch override follow-up receipt validation into an actionable repair loop for the group main Agent.

The loop must create one stable repair work item, expose it as a dispatch candidate, generate a self-contained corrected-receipt retry brief, and close the same work item after a compliant child-agent receipt passes validation. It must not automatically create a real third-party Agent task.

## Implemented

- Added deterministic repair work-item synchronization in `backend/modules/collaboration/group-orchestrator.ts`:
  - source: `worker_context_provider_dispatch_override_followup_receipt_contract_validation_repair`
  - component: `worker_context_provider_dispatch_override_followup_receipt_contract`
  - owner: `group-main-agent`
  - priority: `high`
- A failed Phase 152 validation now creates or updates one open repair item keyed by the validation contract.
- The repair item preserves the complete correction scope:
  - validation id
  - required memory rel paths
  - follow-up work item ids
  - provider dispatch override ids
  - validation gap codes
- A passing validation completes the same repair item with:
  - `completion_source=provider_dispatch_override_followup_receipt_contract_validation`
  - a stable resolution reason
- Extended replay-repair dispatch candidates with the Phase 153 validation metadata.
- Extended retry-brief generation with a focused corrected-receipt task that requires:
  - `relPath`
  - `repairWorkItemId`
  - `providerDispatchOverrideId`
  - `usageState=verified`
  - `repairStatus=completed`
  - `repairGapType=provider_dispatch_override_followup`
  - `currentSourceVerified=true`
  - `providerDispatchOverrideFollowupHistoryReverified=true`
- Retry briefs explicitly prohibit unrelated implementation work and keep `should_create_real_task=false`.
- Added Memory Center report and quality check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_validation_repair`
- Added system/group overview alerts for uncovered repair loops.
- Added Phase 153 end-to-end selftest:
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptValidationRepairSelfTest()`
- Stabilized the existing cross-group pressure-recall repair selftest by evaluating its fixed fixture timestamps against the same logical clock.

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- Phase 153 focused dist selftest: pass
- Phase 151/152 adjacent regression: pass
- Phase 137-153 and core memory regression: 33/33 pass
  - pressure memory recall and repair recall
  - pressure provenance receipt usage
  - ignore-memory policy
  - pre-dispatch gate
  - compaction retry
  - runtime packet rendering and usage
  - worker handoff
- `npm run build`: pass after the final selftest clock stabilization.

Failed-validation repair state:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "checkedValidationCount": 1,
  "openRepairItemCount": 1,
  "readyCandidateCount": 1,
  "readyBriefCount": 1
}
```

Resolved repair state:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "checkedValidationCount": 1,
  "completedRepairItemCount": 1,
  "readyCandidateCount": 0,
  "readyBriefCount": 0
}
```

## Stable Memory

A failed repaired-history sampling receipt is now an operational state, not only a quality alert.

The group main Agent receives one idempotent repair work item and one self-contained retry brief containing the exact rel paths, follow-up work item ids, provider override ids, missing evidence, and required corrected receipt fields. The brief remains advisory until the main Agent chooses to dispatch it. Once a compliant corrected receipt passes the Phase 152 contract, the same repair item is completed and its ready candidate/brief are retired.

This keeps retry execution safe across newly created third-party child-agent sessions: every retry has the full memory provenance contract in its own task context and does not depend on hidden session history.

## Next Direction

The next upgrade should persist failed and repaired corrected-receipt attempts into typed group memory, then feed repeated repair failures back into provider-specific pre-dispatch policy. Repeated noncompliance should escalate from sampling to hold, while a verified repair should decay back through monitor status without losing its audit history.
