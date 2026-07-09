# Phase 85 - API Microcompact Native Apply Proof Ledger

## Goal

Upgrade CCM group memory toward Claude Code-style context management by making API microcompact `native_applied` claims durable and auditable. A child Agent receipt is no longer treated as strong native apply proof only because it says `native_applied`; it must also match the edit plan checksum, native apply plan checksum, request patch checksum, child Agent session, native session, and memory context snapshot binding.

## Implemented

- Added per-group sidecar ledger:
  - `group-api-microcompact-native-apply-proof/<group>.json`
  - schema `ccm-group-api-microcompact-native-apply-proof-ledger-v1`
- Added proof recording from delivery summaries:
  - `verified`: receipt claimed `native_applied` and passed checksum/session/snapshot/native-ready validation.
  - `failed`: receipt claimed `native_applied` but checksum, request patch, session, snapshot, or native-ready contract failed.
  - `advisory`: child Agent used the edit plan only as metadata/context pressure.
  - `not_supported`: child Agent declared unsupported/ignored native API context management.
- Added child Agent context injection:
  - `compaction.apiMicrocompactNativeApplyProofLedger`
  - raw source `group_api_microcompact_native_apply_proof_ledger_file`
  - rendered context now tells fresh third-party Agent sessions which historical native apply claims are verified and which must not be trusted.
- Added Memory Center governance:
  - report `ccm-api-microcompact-native-apply-proof-report-v1`
  - quality check id `api_microcompact_native_apply_proof`
  - group detail field `postCompactUsage.apiMicrocompactNativeApplyProof`
  - overview alerts for missing/failed native proof.
- Added Memory Center UI panel:
  - `API Microcompact Native Apply Proof`
  - shows checked/passed, verified proof, failed proof, missing proof, ledger entries, and request/session details.
- Added runtime selftest:
  - `runMemoryCenterApiMicrocompactNativeApplyProofSelfTest`
- Added static guard:
  - `memoryCenterGovernsApiMicrocompactNativeApplyProof`

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
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

Phase 85 closes the gap between "receipt text says native applied" and "provider request actually carried the context-management patch." The group memory system can now preserve native API microcompact proof as a reusable audit context for future child Agent sessions.

## Remaining Direction

The long-term Claude Code parity goal is still active. The next likely upgrades are deeper provider request telemetry capture, proof aging/freshness policy, and stronger replay checks that compare proof ledger state against actual child Agent dispatch/runtime adapters.
