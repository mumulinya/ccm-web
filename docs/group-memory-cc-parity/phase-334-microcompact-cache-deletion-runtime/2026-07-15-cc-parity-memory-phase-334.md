# CCM Memory Phase 334: Microcompact Prompt Cache Deletion Runtime

Date: 2026-07-15

## Goal

Close the remaining Claude Code parity gap for prompt-cache accounting after provider-native microcompact. A verified `cache_edits` outcome may reduce Anthropic cache-read tokens without being a cache break, but that credit must be exact-session, durable, body-free, and consumable once only.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\compact\microCompact.ts`
- `D:\claude-code\src\services\api\promptCacheBreakDetection.ts`

Claude Code calls `notifyCacheDeletion(querySource)` after cached or time-based microcompact changes the provider prompt. Its next cache observation consumes `cacheDeletionsPending`, clears pending changes, and does not classify the expected drop as a cache break. This differs from full compact: microcompact preserves the remaining cache lifecycle instead of resetting the whole generation.

## Implementation

### Durable exact-session notification

`backend/modules/collaboration/group-prompt-cache-break-detection.ts` now provides:

- `ccm-group-prompt-cache-deletion-notification-v1`
- `notifyGroupPromptCacheDeletion()`
- `verifyGroupPromptCacheDeletionNotification()`
- `pending_cache_deletion`
- bounded durable notification history and notified/consumed counters

Admission requires all of the following:

- provider execution receipt checksum verifies;
- `status=native_applied`;
- `strong_proof=true`;
- `provider_outcome_verified=true`;
- at least one applied edit;
- positive cleared input tokens;
- exact `group_id + gcs_*` ownership.

`request_accepted`, `no_edits_applied`, `request_failed`, advisory/CLI plans, tampered receipts, and cross-session receipts receive no expected-deletion credit.

### Runtime order

`backend/modules/collaboration/group-orchestrator-llm-client.ts` records and verifies the provider-native execution receipt, creates the deletion notification, and only then invokes the token-usage callback. Therefore the same response that proves the applied edit consumes the pending deletion marker.

The consumption event is:

```text
classification=expected_microcompact_cache_deletion
cache_break=false
cache_deletion_applied=true
```

The response cache-read value becomes the next comparison baseline. The credit is one-shot; a later unexplained drop again uses the Claude Code threshold of more than 5 percent and at least 2,000 tokens.

### Visibility

- Memory Center shows pending/consumed microcompact cache deletion state, execution receipt identity, counts, and checksum status.
- Controlled child-Agent memory packets expose `microcompactDeletion` and the exact execution receipt ID.
- The ledger remains body-free and is removed with the exact group session.

## Verification

Dedicated test:

```text
node scripts/group-prompt-cache-microcompact-deletion-runtime-restart-selftest.mjs
PHASE334_RESULT={"checks":15,"passed":15}
```

Coverage includes the real Anthropic-compatible adapter, same-response ordering, one-shot consumption, restart persistence, duplicate idempotency, sibling-session isolation, weak outcomes, tamper and cross-session rejection, Memory Center, child-Agent context, and body-free storage.

Adjacent regressions:

```text
Phase 333 post-compact cache runtime: 14/14
Provider native compact execution receipt: 21/21
Phase 332 post-compact session reset: 14/14
Phase 331 session-memory API invariant closure: 14/14
Phase 330 session-memory compact selection: 15/15
Boundary journal: 16/16
npm run check: passed
npm run build: passed (frontend, MCP Feishu, backend)
```

## Result

The requested core memory workflow is production-complete: multi-chat session memory, global-only Global Agent context, compression/recovery, child-Agent reinjection, and both full-compact and microcompact prompt-cache lifecycle handling are closed. Future phases are ongoing Claude Code evolution tracking, not unfinished core capability.
