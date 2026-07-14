# Phase 216: Trusted model capability cache

Date: 2026-07-12

## Goal

Replace shared or guessed child-Agent context budgets with a provider/model capability record that is attributable, checksummed, time bounded, and conservative when evidence is missing.

## Stable behavior

- Capability identity is `provider::model`; an empty model is the provider default.
- Evidence priority is explicit provider capability, verified native executor receipt, user setting, then the Claude Code style conservative default.
- Unknown OpenAI-compatible model names never imply a large context window.
- Expired, malformed, future-dated, unverified native, or checksum-invalid evidence is not used.
- Conservative fallback is a 200,000 token context window, 20,000 output reserve, 180,000 effective input window, and 167,000 auto-compact threshold.
- Provider output reserve follows the CC rule and is capped at 20,000 tokens for compaction budgeting.
- WorkerContextPacket stores `model_context_capacity`; `context_usage.capacity_provenance` repeats the proof used for budgeting.
- The capability proof participates in the WorkerContextPacket id so a capacity change creates a distinct packet identity.
- Child-Agent packet budgets now default to the selected provider/model effective window instead of a shared 90,000 token constant.

## Persistence

Capability cache:

`~/.cc-connect/memory-control/model-capability-cache.json`

Each entry stores source, confidence, priority, checked time, expiry, evidence id, context window, maximum output, and SHA-256 checksum. The cache envelope is also checksummed and written atomically.

Default maximum ages:

- Explicit provider capability: 30 days
- Verified native executor receipt: 14 days
- User setting: 90 days

## API and Memory Center

- `GET /api/groups/memory/capacity` includes cache summary and resolved capacity provenance.
- `GET /api/groups/memory/capabilities` lists cached provider/model evidence.
- `POST /api/groups/memory/capabilities` accepts only `user_setting`; provider and native evidence must enter through trusted execution code.
- Memory Center displays source, cache state, confidence, expiry, active/expired cache totals, and provides provider/model-specific user settings.

## Main files

- `backend/modules/collaboration/model-capability-cache.ts`
- `backend/modules/collaboration/group-memory-compaction.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/agents/runtime-kernel.ts`
- `backend/modules/collaboration/group-routes.ts`
- `backend/modules/collaboration/orchestrator-routes.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/model-capability-cache-selftest.mjs`

## Verification contract

The phase is accepted only when all of the following pass:

1. TypeScript checks for backend and Feishu MCP.
2. Backend production build.
3. Frontend production build.
4. Existing group model-capacity self-test.
5. Capability-cache self-test proving trusted 516K capacity, rejected unverified native evidence, expired evidence fallback, unknown-provider fallback, and WorkerContextPacket provenance binding.
6. `git diff --check` for Phase 216 files.

## Follow-up

Future phases should collect verified capability receipts from native runner telemetry automatically, add cache refresh/revocation maintenance, and use real provider token usage receipts to recalibrate memory injection envelopes without weakening the conservative fallback.
