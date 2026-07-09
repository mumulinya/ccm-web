# Phase 150 - Provider Dispatch Override Follow-up Pre-dispatch Memory

## Goal

Use Phase 149's typed provider-dispatch override follow-up memory during pre-dispatch provider selection.

Phase 149 made completed override follow-up repairs durable as feedback typed `MEMORY.md`. Phase 150 closes the next loop: group main-agent pre-dispatch policy now consumes that repaired history before launching a new third-party child-agent session. Repaired history can support monitored dispatch with receipt sampling, but a new active/relapsed `hold_until_repair` advisory still wins.

## Implemented

- Extended `buildPressureProvenancePreDispatchComplianceDispatchPolicy(...)` to read `pressureProvenanceProviderDispatchOverrideFollowupArchive`.
- Merged matching provider override follow-up attributions into policy rows by `agentType + project`.
- Added policy row fields:
  - `provider_override_followup_repaired`
  - `provider_override_followup_repaired_count`
  - `provider_override_followup_memory_provenance_usage_count`
  - `provider_override_followup_current_source_verified_count`
  - `provider_override_followup_last_completed_at`
  - `provider_override_followup_fresh_after_last_violation`
  - `provider_override_followup_rel_paths`
  - `provider_override_followup_work_item_ids`
  - `provider_override_followup_override_ids`
- Added synthetic repaired-history policy rows when a group has verified override follow-up history but no current violation attribution.
- Updated provider advisory health:
  - active relapsed rows still become `critical` and `hold_until_repair`
  - repaired-history rows without a new active relapse become `monitor` and `allow_with_receipt_sampling`
- Added repaired-history evidence into:
  - provider dispatch advisory selected candidate
  - pre-dispatch gate
  - provider dispatch decision ledger evidence
- Added orchestrator selftest:
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideFollowupPreDispatchMemorySelfTest()`
- Added Memory Center quality check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_pre_dispatch_policy`
- Added Memory Center selftest:
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupPreDispatchPolicySelfTest()`
- Added overview report and alert wiring for groups where typed override follow-up history exists but is not surfaced in pre-dispatch policy.

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- Dist regression: pass
  - Phase 150 orchestrator repaired-history pre-dispatch behavior
  - Phase 150 Memory Center pre-dispatch policy coverage
  - Phase 149 typed-memory override follow-up
  - Phase 148 override completion/follow-up closure
  - Phase 147 override receipts
  - Phase 146 provider dispatch decision ledger
  - Phase 145 provider dispatch gate
  - Phase 144 provider dispatch advisory
  - runtime / worker context usage / worker handoff
- `npm run build`: pass
- Final Phase 150 dist selftests after full build: pass

Final Phase 150 orchestrator result:

```json
{
  "repaired": {
    "health_status": "monitor",
    "dispatch_policy": "allow_with_receipt_sampling",
    "provider_override_followup_repaired": true,
    "action": "dispatch_with_receipt_sampling",
    "dispatch_ready": true
  },
  "relapsed": {
    "health_status": "critical",
    "dispatch_policy": "hold_until_repair",
    "provider_override_followup_repaired": true,
    "provider_override_followup_fresh_after_last_violation": false,
    "action": "hold_until_repair",
    "dispatch_ready": false
  }
}
```

Final Phase 150 Memory Center result:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "providerOverrideFollowupAttributionCount": 1,
  "coveredProviderOverrideFollowupAttributionCount": 1,
  "missingProviderOverrideFollowupPolicyCount": 0
}
```

## Stable Memory

Completed provider-dispatch override follow-up history is now both durable and operational.

The memory system no longer only stores repaired override history as typed `MEMORY.md`; it also uses that history when preparing new child-agent dispatch. If the same `agentType + project` has verified repaired-history and no newer active relapse, the group main-agent can dispatch with receipt sampling. If a newer active/relapsed violation appears after the repair, the provider advisory stays `critical` and the pre-dispatch gate blocks with `hold_until_repair`.

## Next Direction

The next upgrade should surface this repaired-history policy signal directly inside the child-agent WorkerContextPacket receipt contract, so a sampled child-agent dispatch knows why sampling is required and which repaired override history must be re-verified in its final receipt.
