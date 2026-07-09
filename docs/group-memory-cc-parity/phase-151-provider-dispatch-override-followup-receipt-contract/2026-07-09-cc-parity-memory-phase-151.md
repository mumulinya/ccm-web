# Phase 151 - Provider Dispatch Override Follow-up Receipt Contract

## Goal

Surface repaired provider-dispatch override follow-up history directly inside the child-agent WorkerContextPacket receipt contract.

Phase 150 made repaired-history influence pre-dispatch provider selection. Phase 151 makes that decision visible and actionable to the sampled child Agent: when a provider dispatch is allowed because historical override follow-up repair was verified, the WorkerContextPacket now tells the child Agent which rel paths, follow-up work items, and override ids must be rechecked in the final receipt.

## Implemented

- Added runtime contract extraction and rendering:
  - `ccm-pressure-provenance-provider-dispatch-override-followup-receipt-contract-v1`
- The contract is derived from provider dispatch advisory selected-candidate fields when:
  - `provider_override_followup_repaired=true`
  - dispatch policy is `allow_with_receipt_sampling`
  - provider hold is not active
- The contract carries:
  - `agent_type`
  - `project`
  - repaired count
  - memory provenance usage count
  - current source verified count
  - last completed timestamp
  - freshness-after-last-violation flag
  - repaired-history rel paths
  - follow-up work item ids
  - override ids
- WorkerContextPacket acceptance now declares:
  - `pressure_provenance_provider_dispatch_override_followup_sampling_required`
  - `pressure_provenance_provider_dispatch_override_followup_receipt_required`
  - `provider_dispatch_override_followup_history_reverification_required`
  - `memory_provenance_usage_required`
- WorkerContextPacket rendering now includes:
  - `Provider dispatch override follow-up receipt contract`
  - required receipt fields
  - `providerDispatchOverrideFollowupHistoryReverified=true`
  - copyable `CCM_AGENT_RECEIPT.memoryProvenanceUsage` example rows
- Context usage now includes required category:
  - `pressure_provenance_provider_dispatch_override_followup_receipt_contract`
- Assignment binding ledger persists:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract`
  - render probe flag `has_pressure_provenance_provider_dispatch_override_followup_receipt_contract`
  - ledger counter `providerDispatchOverrideFollowupReceiptContractCount`
- Added runtime selftest:
  - `runWorkerContextProviderDispatchOverrideFollowupReceiptContractSelfTest()`
- Added Memory Center report/check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_receipt_contract`
- Added Memory Center selftest:
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupReceiptContractSelfTest()`
- Added overview report and alert wiring so missing receipt contracts surface as group/system memory quality gaps.

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- Dist regression: pass
  - Phase 151 runtime receipt contract
  - Phase 151 Memory Center receipt contract coverage
  - Phase 150 repaired-history pre-dispatch policy
  - Phase 149 override follow-up typed memory
  - Phase 148 override completion and repair closure
  - Phase 145 provider dispatch gate
  - runtime / worker context usage / worker handoff
- `npm run build`: pass
- Final Phase 151 dist selftests after full build: pass

Final Phase 151 runtime result:

```json
{
  "packetCarriesContract": true,
  "acceptanceRequiresSamplingReceipt": true,
  "usageCategorizesContract": true,
  "renderedShowsContract": true,
  "advisoryDoesNotHold": true
}
```

Final Phase 151 Memory Center result:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "checkedPacketCount": 1,
  "coveredPacketCount": 1,
  "failedPacketCount": 0
}
```

## Stable Memory

Repaired provider-dispatch override history is now visible to child Agents as a receipt contract.

When repaired-history changes dispatch from hold to receipt sampling, the WorkerContextPacket must carry the repaired rel paths, follow-up work item ids, and override ids. The child Agent must reverify current source evidence and include `memoryProvenanceUsage` rows with `currentSourceVerified=true` and `providerDispatchOverrideFollowupHistoryReverified=true`.

## Next Direction

The next upgrade should validate final child-agent receipts against this Phase 151 contract. A sampled dispatch should not be considered clean unless the returned receipt explicitly covers the repaired-history contract rows and marks each used row as reverified against current source.
