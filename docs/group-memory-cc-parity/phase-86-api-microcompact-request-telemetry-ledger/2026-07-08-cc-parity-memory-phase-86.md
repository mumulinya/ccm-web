# Phase 86 - API Microcompact Request Telemetry Ledger

## Goal

Continue the Claude Code parity track by tightening Phase 85 native apply proof. A child Agent receipt and proof ledger entry are no longer enough by themselves: a `native_applied` claim should also match request telemetry from the provider API request path.

Claude Code keeps compaction, transcript markers, session memory, and telemetry connected. This phase moves CCM in that direction by adding a durable request telemetry sidecar that can be matched against native API microcompact proof.

## Implemented

- Added per-group request telemetry sidecar:
  - `group-api-microcompact-native-apply-request-telemetry/<group>.json`
  - schema `ccm-group-api-microcompact-native-apply-request-telemetry-ledger-v1`
- Added ledger APIs:
  - `readGroupApiMicrocompactNativeApplyRequestTelemetryLedger`
  - `recordGroupApiMicrocompactNativeApplyRequestTelemetryLedger`
  - `buildGroupApiMicrocompactNativeApplyRequestTelemetrySummary`
- Request telemetry captures stable, low-sensitive fingerprints:
  - `planChecksum`
  - `applyPlanChecksum`
  - `requestPatchChecksum`
  - `requestBodyChecksum`
  - beta headers
  - provider/model/endpoint/method
  - response status/request id
  - task Agent session/native session
  - memory context snapshot id/checksum
  - `sentAt`
- Delivery summaries now preserve and record:
  - `apiMicrocompactNativeApplyRequestTelemetry`
  - `api_microcompact_native_apply_request_telemetry_ledger`
  - `api_microcompact_native_apply_request_telemetry_ledger_file`
- Proof summary now enriches verified proof entries with request telemetry:
  - `request_telemetry_matched`
  - `request_telemetry_status`
  - `request_telemetry_entry_id`
  - matched/missing/stale counts
- Memory Center native proof report is stricter:
  - a native claim passes only when verified proof also has matched request telemetry.
  - missing or invalid request telemetry becomes a governance gap.
- Worker handoff and group dispatch receipt contracts now require `apiMicrocompactNativeApplyRequestTelemetry` when a child Agent claims `native_applied`.
- Memory Center UI now shows telemetry matched/missing/invalid counts in the Native Apply Proof panel.

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/agents/worker-handoff.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Verification

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- Runtime selftests:
  - `runApiMicrocompactReceiptValidationSelfTest`
  - `runMemoryCenterApiMicrocompactNativeApplyProofSelfTest`
- Targeted Memory Center quality report:
  - `api_microcompact_native_apply_proof`
- `npm run check`
- `npm run build`

## Result

Phase 86 upgrades native API microcompact from receipt/proof bookkeeping to a closer CC-style evidence chain:

`native apply plan -> provider request telemetry -> child Agent receipt -> proof ledger -> Memory Center governance -> next child Agent context`

Fresh third-party child Agent sessions can now see whether historical `native_applied` evidence was backed by a real provider request fingerprint, instead of treating receipt text as enough.

## Remaining Direction

The long-term goal remains active. Next high-value steps:

- capture request telemetry directly from native runtime adapters, not only from Agent receipts.
- add proof aging policy that downgrades stale telemetry over time.
- replay proof/telemetry against real child Agent dispatch records and native session continuity.
