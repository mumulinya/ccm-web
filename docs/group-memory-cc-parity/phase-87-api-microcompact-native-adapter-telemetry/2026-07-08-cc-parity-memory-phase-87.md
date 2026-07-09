# Phase 87 - API Microcompact Native Adapter Telemetry

## Goal

Continue the Claude Code parity track by moving API microcompact proof closer to the provider request layer.

Phase 86 made `native_applied` claims require request telemetry, but that telemetry could still be supplied by a child Agent receipt. Phase 87 adds an adapter-side capture path so CCM can record provider request fingerprints when the native Anthropic-compatible request is actually built and sent.

## Implemented

- Added adapter telemetry helpers in `backend/modules/collaboration/memory.ts`:
  - `buildGroupApiMicrocompactNativeApplyAdapterTelemetryRow`
  - `recordGroupApiMicrocompactNativeApplyAdapterTelemetry`
- Adapter telemetry records only stable fingerprints and metadata:
  - request body checksum
  - request patch checksum
  - beta headers
  - provider/model/endpoint/method
  - response status/request id
  - task Agent session/native session
  - memory context snapshot id/checksum
  - `telemetrySource: native_request_adapter`
- Updated Anthropic-compatible group orchestrator LLM client:
  - applies `apiMicrocompactNativeApplyPlan.requestPatch.body.context_management` to the request body when native apply is ready.
  - appends the required `anthropic-beta` context-management header.
  - records adapter telemetry immediately after provider fetch or fetch failure.
- Added native adapter selftest:
  - `runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest`
  - uses mock fetch to prove the actual request body includes `context_management`, the beta header is set, and the telemetry ledger records `native_request_adapter`.
- Memory Center proof governance now distinguishes telemetry sources:
  - adapter matched count
  - receipt matched count
  - adapter entry count
  - receipt entry count
- Existing Memory Center native proof selftest now writes telemetry through the adapter helper rather than directly faking the request telemetry ledger.
- Child Agent rendered memory context now includes adapter/receipt matched counts in the API microcompact native proof line.
- Memory Center UI Native Apply Proof panel now shows adapter telemetry coverage and row-level source.

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/group-orchestrator-llm-client.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Verification

- `npm run build:backend`
- `node -e "(async()=>{const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator-llm-client.js'); const r=await m.runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);})().catch(err=>{console.error(err); process.exit(1);})"`
- `node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build`
- Targeted quality probe:
  - `buildMemoryQualityReport({ lightweight: true })`
  - `api_microcompact_native_apply_proof` currently reports `empty` on real data because no sampled real task claims `native_applied`.

## Result

Phase 87 upgrades the evidence chain from:

`Agent receipt telemetry -> proof ledger -> Memory Center`

to:

`native request adapter capture -> request telemetry ledger -> child Agent receipt/proof ledger -> Memory Center -> next child Agent context`

This does not claim that CLI child Agents can now natively apply Anthropic context-management. CLI executors still remain advisory unless they expose a real provider request body. The new path is ready for API-style child Agent runtimes and for any future native adapter that can supply the request body before dispatch.

## Remaining Direction

The long-term goal remains active. Next high-value steps:

- add stale telemetry aging and downgrade policy for old `native_applied` proof.
- bind adapter telemetry to external runner request ids when a future child Agent API runtime is introduced.
- replay proof/telemetry against real dispatch histories and session continuity records.
- add fail-closed UI warnings when a child Agent receipt claims `native_applied` but only receipt-sourced telemetry exists.
