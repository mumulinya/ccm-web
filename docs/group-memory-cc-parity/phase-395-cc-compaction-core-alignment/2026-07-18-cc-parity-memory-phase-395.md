# Phase 395: Claude Code compaction core alignment

## Scope

This phase closes the four concrete gaps found in the source comparison. It does not add Memory Center cards, new governance layers, or a parallel memory store.

## Claude Code references

- `D:/claude-code/src/utils/tokens.ts:230`: use the latest API usage and estimate messages added afterward.
- `D:/claude-code/src/services/compact/autoCompact.ts:30`: reserve 20,000 output tokens for the compact summary.
- `D:/claude-code/src/services/compact/compact.ts:229`: retry prompt-too-long compaction requests at most three times.
- `D:/claude-code/src/services/compact/compact.ts:245`: remove the oldest complete API-round groups, preserving at least one round.
- `D:/claude-code/src/commands/compact/compact.ts:52`: accept optional `/compact` instructions.

## CCM changes

### Provider-observed group-main context

The existing exact-session prompt-cache ledger now retains the latest `group_main_planning` usage event. Context pressure uses:

```text
provider_observed = direct_input + cache_creation + cache_read + output
positive_drift = max(0, provider_observed - provider_prompt_estimate)
model_visible_context = current_message_estimate + positive_drift
```

The baseline is bound to `group + gcs_* + provider + model + baseline generation`. Sibling sessions, checksum failures, provider/model mismatches, and post-compact reset-pending state fail closed. Negative drift never relaxes the compact threshold.

### Complete-round PTL recovery

Compaction input is grouped by real user rounds. Tool-result user records stay with their surrounding round. Before the request, an oversized payload drops oldest complete rounds. If the provider still returns prompt-too-long or HTTP 413, CCM retries up to three times and always preserves at least one complete round.

Media, binary payloads, and attachments that are restored after compaction are removed before rebuilding the model preservation reference. The canonical preservation reference is normalized before model validation, avoiding non-idempotent truncation mismatches.

### Summary budget and manual instructions

- Default model compact output budget is now 20,000 tokens.
- `/compact` remains bound to the current exact `gcs_*` session.
- `/compact <instructions>` passes up to 4,000 characters of user focus instructions to the model compact request.
- Model-required and fail-closed behavior remains unchanged.

## Verification

- `group-cc-compaction-core-alignment-selftest.mjs`: 18/18.
- `group-compaction-summary-input-projection-restart-selftest.mjs`: 18/18.
- `group-compaction-model-usage-restart-selftest.mjs`: 23/23.
- Slash command backend self-test: all checks passed, including direct exact-session compact.
- Backend TypeScript build: passed.
- Frontend Vite build: passed, 2,059 modules.
- Split export check: passed.
- Factory dependency check: passed.
- Paid provider calls: 0. PTL verification used a local mock HTTP server.

The legacy `group-prompt-cache-post-compact-runtime-restart-selftest.mjs` reached Windows cleanup twice and then failed to remove its temporary SQLite file with `EBUSY`. No functional assertion failed before cleanup; this is recorded as a test-harness cleanup limitation rather than a compaction failure.
