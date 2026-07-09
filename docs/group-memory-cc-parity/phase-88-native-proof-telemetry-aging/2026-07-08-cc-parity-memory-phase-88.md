# Phase 88 - Native Proof Telemetry Aging

## Goal

Continue the Claude Code parity track by making API microcompact native apply proof time-aware and source-aware.

Phase 87 introduced adapter-side request telemetry. Phase 88 closes the next gap: `native_applied` must not stay strong forever, and telemetry reported only by a child Agent receipt must not be treated as equivalent to telemetry captured by the provider request adapter.

## Implemented

- Added default native apply telemetry freshness TTL:
  - `GROUP_API_MICROCOMPACT_NATIVE_APPLY_TELEMETRY_MAX_AGE_MS`
  - default: 14 days
- Enriched proof summary rows with:
  - `request_telemetry_strong`
  - `request_telemetry_fresh`
  - `request_telemetry_stale`
  - `request_telemetry_age_ms`
  - `request_telemetry_adapter_captured`
  - `request_telemetry_weak_reason`
- Memory Center native proof governance now only counts a proof as passed when all of these are true:
  - proof ledger status is verified
  - request telemetry is matched
  - telemetry is fresh
  - telemetry source is `native_request_adapter`
- Receipt-only telemetry is now downgraded:
  - it remains visible as evidence.
  - it no longer counts as strong proof.
  - Memory Center emits a high-severity gap.
- Stale adapter telemetry is now downgraded:
  - it remains visible as historical evidence.
  - it no longer counts as strong proof.
  - Memory Center emits a high-severity gap with `ageMs` and `maxAgeMs`.
- Memory Center report and UI now expose:
  - strong telemetry count
  - receipt-only count
  - stale count
  - max age policy
  - row-level telemetry age and strong-proof state
- Worker handoff and group child-Agent receipt contract now say:
  - strong `native_applied` proof requires fresh `native_request_adapter` telemetry.
  - `agent_receipt` telemetry is weak evidence only.
- Child Agent rendered memory context now shows:
  - `strong`
  - `adapter`
  - `receipt`
  - `receiptOnly`
  - `stale`

## Files

- `backend/modules/collaboration/memory.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/agents/worker-handoff.ts`
- `backend/modules/collaboration/collaboration.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/main-agent-decision-ui-selftest.mjs`

## Verification

- `npm run build:backend`
- `node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"`
- `node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks,overall:r.report&&r.report.overall},null,2)); if(!r.pass) process.exit(1);"`
- `node -e "(async()=>{const m=require('./ccm-package/dist/modules/collaboration/group-orchestrator-llm-client.js'); const r=await m.runGroupOrchestratorApiMicrocompactNativeAdapterTelemetrySelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);})().catch(err=>{console.error(err); process.exit(1);})"`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build`
- Post-build runtime selftests:
  - `runMemoryCenterApiMicrocompactNativeApplyProofAgingSelfTest`
  - `runMemoryCenterApiMicrocompactNativeApplyProofSelfTest`

## Result

Phase 88 turns native apply evidence from a static ledger match into a governed proof state:

`verified proof + fresh native_request_adapter telemetry = strong native_applied proof`

Everything else is visible but downgraded:

- `agent_receipt` telemetry: weak evidence
- stale adapter telemetry: historical evidence
- invalid/missing telemetry: proof gap

This is closer to Claude Code-style context management because future child Agent sessions no longer inherit old or self-reported native apply evidence as if it were current provider-request truth.

## Remaining Direction

The long-term goal remains active. Next high-value steps:

- bind adapter telemetry to external runner request ids and task-agent session records.
- add replay checks that verify proof/telemetry against real dispatch history.
- surface per-group stale native proof repair actions in Memory Center.
- continue tightening context re-injection so third-party child Agents receive only strong current proof as authoritative context.
