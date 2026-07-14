# Phase 217: Native capability receipts and revocation

Date: 2026-07-12

## Goal

Turn the provider/model capability cache into a closed trust loop: collect model capacity from native CLI telemetry, bind it to the real child-Agent execution, reject Agent-authored claims, and support revocation plus bounded expiry cleanup.

## Native receipt trust boundary

CCM only extracts capacity from top-level JSON events emitted by Codex or Cursor CLI execution. JSON-like text inside an Agent message is never parsed as model capability evidence.

Receipt schema:

`ccm-native-model-capability-receipt-v1`

Each receipt binds:

- Provider and model
- Context window and maximum output
- Native event type, index, and event SHA-256
- Direct CLI or Node runner identity
- Runner request id and PID when applicable
- Group, task, execution, task-Agent session, and native session
- Capture time and stable-content SHA-256

For a group task, a receipt without the task-Agent session id is rejected. Any expected binding mismatch rejects the receipt. Changing field order does not change the checksum because receipts use recursively sorted stable JSON; changing content does.

## Execution integration

- Direct group CLI execution extracts and verifies native metadata before recording it.
- External Node Runner writes the native receipt into its result; the server revalidates it against the original runner request and child-session binding before cache insertion.
- Direct task-queue project execution uses the same collection path.
- A successful record is written to the task timeline as `native_model_capability_recorded`.
- Agent-generated `CCM_AGENT_RECEIPT` content cannot create or upgrade model capacity evidence.

## Revocation and maintenance

- Revocation preserves the historical entry and adds `revoked`, `revokedAt`, reason, and actor under a new entry checksum.
- Revoked evidence is immediately excluded from capacity resolution and forces conservative fallback when no stronger active evidence exists.
- Envelope checksum failure invalidates the complete cache for resolution, even if individual entry checksums appear valid.
- Maintenance previews or deletes only evidence expired or revoked beyond the configured retention period.
- Maintenance supports provider/evidence filters so tests and targeted cleanup cannot remove unrelated provider records.

APIs:

- `POST /api/groups/memory/capabilities/revoke`
- `POST /api/groups/memory/capabilities/maintenance`

Actual deletion requires `explicitExecution=true`. Memory Center displays revoked totals and exposes revoke, preview, and cleanup controls.

## Main files

- `backend/agents/runtime.ts`
- `backend/agents/runner.ts`
- `backend/server.ts`
- `backend/modules/collaboration/model-capability-cache.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-routes.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/model-capability-cache-selftest.mjs`

## Verification

The Phase 217 self-test proves:

1. Top-level native metadata is extracted.
2. Complete execution/session binding is accepted.
3. Checksum forgery is rejected.
4. Task-Agent session mismatch is rejected.
5. Agent message text cannot claim capacity.
6. A verified native receipt resolves to its provider-specific capacity.
7. Revoked evidence immediately falls back to the conservative CC default.
8. Maintenance preview is non-destructive and filtered execution deletes only its candidate.

TypeScript checks, backend build, frontend production build, the capability self-test, API runtime checks, and `git diff --check` are required before phase closure.

## Follow-up

The next phase should add provider capability refresh scheduling, stale-while-revalidate behavior that never exceeds the last trusted safe bound, and downgrade alarms when a newly verified capacity is smaller than the budget used by active child sessions.
