# Phase 152 - Provider Dispatch Override Follow-up Receipt Validation

## Goal

Validate final child-agent receipts against the Phase 151 provider-dispatch override follow-up receipt contract.

Phase 151 made repaired-history sampling requirements visible inside the WorkerContextPacket. Phase 152 closes the post-dispatch loop: the group main Agent now verifies that the final child-agent receipt covers the repaired rel paths, follow-up work item ids, and provider override ids, and that each relevant memory row was reverified against current source.

## Implemented

- Extended receipt normalization in `backend/modules/collaboration/agent-receipts.ts` to preserve:
  - `providerDispatchOverrideId`
  - `providerDispatchOverrideFollowupHistoryReverified`
- Extended receipt review rendering so the group main Agent can see:
  - current-source verification
  - provider override id
  - override follow-up reverified state
- Added parser selftest:
  - `runAgentReceiptProviderDispatchOverrideFollowupSelfTest()`
- Extended the Phase 151 runtime contract required fields with:
  - `providerDispatchOverrideId`
- Added coordinator receipt validation:
  - `recordWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationForCoordinator(...)`
- Validation checks:
  - final receipt status is done/completed/ok
  - `memoryProvenanceUsage` exists
  - every required rel path is covered
  - every required follow-up work item id is covered
  - every required provider override id is covered
  - relevant rows use `repairGapType=provider_dispatch_override_followup`
  - relevant rows include `usageState`
  - relevant rows include `repairStatus`
  - relevant rows set `currentSourceVerified=true`
  - relevant rows set `providerDispatchOverrideFollowupHistoryReverified=true`
- Binding ledger now persists:
  - `worker_context_provider_dispatch_override_followup_receipt_contract_validation`
  - validation status and timestamp
  - child task/session/execution/receipt metadata
  - validation passed/failed counters
- Added orchestrator selftest:
  - `runWorkerContextProviderDispatchOverrideFollowupReceiptContractValidationSelfTest()`
- Added Memory Center quality check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract_validation`
- Added Memory Center selftest:
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractValidationSelfTest()`
- Added overview report and group/system alert wiring.

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- Dist regression: pass
  - Phase 152 receipt parser
  - Phase 152 coordinator receipt validation
  - Phase 152 Memory Center validation report/check
  - Phase 151 WorkerContextPacket receipt contract
  - Phase 150 repaired-history pre-dispatch policy
  - Phase 149 override follow-up typed memory
  - runtime / worker context usage / worker handoff
- `npm run build`: pass
- Final Phase 152 dist selftests after full build: pass

Invalid receipt result:

```json
{
  "status": "failed",
  "gaps": [
    "missing_rel_path_coverage",
    "missing_followup_work_item_coverage",
    "missing_override_id_coverage"
  ]
}
```

Valid receipt result:

```json
{
  "status": "passed",
  "contract_satisfied": true,
  "covered_rel_path_count": 1,
  "covered_followup_work_item_count": 1,
  "covered_override_id_count": 1
}
```

Final Memory Center result:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "checkedPacketCount": 1,
  "passedValidationCount": 1,
  "failedValidationCount": 0
}
```

## Stable Memory

Repaired-history sampling is no longer complete merely because the contract was injected into the WorkerContextPacket.

The final child-agent receipt must now prove that it rechecked the current source for each repaired-history item it used. The receipt must structurally reference the rel path, follow-up repair work item, provider override id, and set both `currentSourceVerified=true` and `providerDispatchOverrideFollowupHistoryReverified=true`. Failed or missing validation is exposed by Memory Center as a group/system quality gap.

## Next Direction

The next upgrade should turn failed Phase 152 validations into automatic repair work items and self-contained retry briefs, so the group main Agent can dispatch a focused receipt-repair task instead of only reporting the validation failure.
