# Phase 149 - Pressure Provenance Provider Dispatch Override Follow-up Typed Memory

## Goal

Make completed provider-dispatch override follow-ups reusable as typed `MEMORY.md` context.

Phase 148 made a risky provider hold override accountable by requiring a follow-up repair work item and a verified completion receipt. Phase 149 closes the next loop: once that repair is complete, CCM distills the repaired history into feedback typed memory so future group main-agent and child-agent sessions can recall the risk, the repair evidence, and the rule that an old repaired override does not make future provider holds safe by default.

## Implemented

- Added `GROUP_PRESSURE_PROVENANCE_PROVIDER_DISPATCH_OVERRIDE_FOLLOWUP_DISTILLATION_VERSION`.
- Added `distillProviderDispatchOverrideFollowupToTypedMemory(...)` in `backend/modules/collaboration/group-memory-index.ts`.
- Added a dedicated archive key: `pressureProvenanceProviderDispatchOverrideFollowupArchive`.
- The distiller reads completed `dispatch_with_provider_override` binding rows and only archives rows where:
  - `completion_ok=true`
  - completion status is completed
  - `memoryProvenanceUsage` is present
  - every usage row has `currentSourceVerified=true`
  - task-agent session and execution ids are present
- Wrote feedback typed memory document:
  - `provider-dispatch-override-followup-recall.md`
- The generated memory records:
  - group/project/agentType attribution
  - override id, completion id, follow-up work item id
  - child-agent session and execution id
  - evidence rel paths
  - receipt usage reasons
  - stable dispatch reminder that a repaired historical override is not permission to bypass future provider holds
- Added Memory Center report/check:
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_followup_typed_memory`
- The Memory Center report now auto-distills completed override follow-ups, verifies archive coverage, checks typed memory docs, and runs a recall probe.
- Added overview return and alert wiring so groups with completed override repairs but missing typed memory surface as Memory Center gaps.
- Added selftest:
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideFollowupTypedMemorySelfTest()`

## Validation

- `npm run check`: pass
- `npm run build:backend`: pass
- Dist regression: pass
  - Phase 149 typed-memory follow-up check
  - Phase 148 override completion and follow-up closure
  - Phase 147 override receipts
  - Phase 146 provider dispatch decision ledger
  - Phase 145 provider dispatch hold gate
  - Phase 144 provider dispatch advisory
  - Phase 143 compliance health
  - Phase 142 repair work items
  - runtime / worker context usage / worker handoff
- `npm run build`: pass
- Final Phase 149 dist selftest after full build: pass

Final Phase 149 selftest result:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "completedOverrideFollowupCount": 1,
  "archivedOverrideFollowupCount": 1,
  "typedArchiveCount": 1,
  "typedCompletedCount": 1,
  "typedDocCount": 1,
  "recallProbeCoveredCount": 1,
  "metadataGapCount": 0
}
```

## Stable Memory

Provider dispatch override follow-up completion is now durable memory, not just an audit row.

When a child-agent task is dispatched through a provider hold override and later repairs the risk with verified `memoryProvenanceUsage`, CCM writes that repaired loop into feedback typed `MEMORY.md`. Future child-agent sessions can recall that the same `agentType + project` had a provider risk override, how it was repaired, and that new provider holds still require current evidence.

## Next Direction

The next upgrade should use this typed override-follow-up memory during pre-dispatch provider selection: a repaired history can lower stale fear, but a new active `hold_until_repair` advisory must still win unless there is fresh compliant receipt evidence and a valid override receipt.
