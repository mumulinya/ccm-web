# Phase 220: Refresh outcomes and model identity history

Date: 2026-07-12

## Goal

Close two ambiguity gaps: a refresh request must state what actually happened, and a model identity must never survive the native session that proved it.

## Refresh outcome contract

Schema:

`ccm-model-capability-refresh-outcome-v1`

Outcomes:

- `refreshed`: a verified native capability receipt replaced the due evidence.
- `metadata_absent`: Codex/Cursor execution completed but emitted no supported top-level model capacity metadata.
- `unsupported`: the selected runtime has no native capacity metadata adapter.

Each outcome binds request id, old evidence id/checksum, provider/model, attempt count, runner request, task, execution, task-Agent session, native session, new receipt checksum when present, reason, time, and retry time.

The recorder only matches provider-default refresh requests or exact provider + model requests. An execution with unknown model identity cannot acknowledge a model-specific request.

## Retry policy

- `metadata_absent`: six-hour backoff before another native execution may retry.
- `unsupported`: seven-day backoff and action `require_provider_capability_or_user_setting`.
- `refreshed`: the newly checked cache entry replaces the due evidence, so the old request disappears.

The capability recorder captures the due request before replacing its evidence. This lets the subsequent verified outcome acknowledge the exact old request even though it is no longer present in the current cache.

Refresh outcomes are appended to the refresh JSONL journal. Queue generation folds the latest outcome back into request status, attempt count, retry time, and action. Memory Center displays these rows.

## Native-session model identity history

Task-Agent sessions now keep `modelIdentityHistory` with provider, model, context window, evidence checksum, native session id, status, reason, and timestamp.

Rules:

1. A verified native capability receipt adds a `verified` identity row.
2. Repeated evidence for the same native session is deduplicated.
3. Native session invalidation or expiry archives the active identity as `invalidated` and clears active model/capacity fields.
4. Permission drift that rebuilds a native session also archives and clears the active identity.
5. A capability receipt from the failed/invalidated turn cannot immediately restore identity; the new native session must provide fresh evidence.
6. Provider switches remain isolated by the task-session runtime key and cannot inherit another provider session's model identity.

Active fields cleared on invalidation:

- `modelId`
- `modelContextWindow`
- `capacityEvidenceChecksum`
- `modelCapabilitySource`
- `modelCapabilityCheckedAt`

## Execution integration

Direct CLI, external Runner, group child-Agent execution, and direct task-queue execution report refresh outcomes after successful native execution. Task timelines receive `model_capability_refresh_outcome` when a due request was acknowledged.

## Verification

The Phase 220 regression proves:

1. `metadata_absent` enters six-hour backoff.
2. `unsupported` is explicit and does not masquerade as success.
3. `refreshed` acknowledges the replaced due request.
4. Model-specific refresh requests require matching model identity.
5. Verified model identity enters task-session history.
6. Permission drift clears active model capacity and preserves an invalidated historical row.
7. All Phase 216-219 capacity, downgrade, lease, and safety checks remain green.

Required gates are TypeScript checks, backend/frontend production builds, capacity regression, refresh race regression, runtime API inspection, clean test residue, and `git diff --check`.

## Follow-up

The next phase should persist refresh outcomes in a compact status ledger with retention, expose per-provider refresh health metrics, and prevent repeated metadata-absent attempts from crowding the long-term journal.
