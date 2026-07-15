# Claude Code Parity Memory Phase 292

Date: 2026-07-14

## Objective

Phase 292 closes a multi-session ownership gap in the compact lifecycle. Group memory, raw messages, typed memory, and compact heads were already bound to `groupId + gcs_*`, but the durable pre/post compact hook ledger was still stored as one group-only file. Two conversations in the same group could therefore share diagnostic hook evidence even though their memory bodies were independent.

This phase makes compact hooks, compact boundaries, and compact transaction identities exact-session artifacts.

## Claude Code Reference

The reference implementation keeps compact boundaries as first-class session events and preserves compact lineage across resume:

- `D:\claude-code\src\services\compact\compact.ts`
- `D:\claude-code\src\utils\messages.ts`
- `D:\claude-code\src\utils\sessionStorage.ts`
- `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts`

CCM has an additional group-chat ownership dimension, so equivalent compact evidence must include both the group and the exact group conversation session.

## Exact-Session Hook Ledger

New hook ledgers use:

`ccm-group-memory-compaction-hook-ledger-v2`

The file layout is:

`group-memory-compaction-hooks/<groupId>/<gcs_session_id>.json`

The envelope records:

- `groupId`
- `groupSessionId`
- `scopeId=groupId::gcs_*`
- `scopeValid`
- `scopeIssues`
- `rejectedEntryCount`

Every pre/post hook entry records `group_id` and `group_session_id`. Reads verify the envelope and every entry. A schema mismatch, group mismatch, session mismatch, mixed-session entry, or unreadable JSON makes the complete ledger unavailable. Cross-session rows are not partially accepted.

Group-only and legacy `default` reads return an empty invalid scope. Existing v1 group-only files are not migrated or merged into an active conversation.

## Compact Identity V2

New compact receipts use:

`ccm-group-memory-compact-transaction-receipt-v2`

`group_session_id` is now mandatory and participates in the receipt ID. New hook run IDs and compact boundary IDs also include exact-session identity material. As a result, sibling sessions compacting in the same millisecond cannot share a receipt ID or compact epoch merely because group ID, message count, and timestamps coincide.

The verifier remains able to read a checksummed v1 receipt when it already carries a valid exact `gcs_*` session. New writes always emit v2.

## Runtime Rules

- `compactGroupConversationMemory()` rejects a missing group ID, missing session ID, and legacy `default` session before compaction.
- Auto-compaction continues to key its running and pending state by `groupId::gcs_*`.
- Memory Center reads the hook ledger for the selected exact session.
- Hook, historical replay, child-Agent replay, boundary replay, and repair-work-item reports enumerate exact session memory scopes rather than group-only memory files.
- Session-memory fleet diagnostics ignore legacy `default` files so exact-only readers are never called with a bare group scope.
- Global Agent context remains global-only and does not receive hook ledgers or group-session diagnostics.

## Verification

Dedicated integration test:

- `scripts/group-memory-compaction-hook-session-isolation-selftest.mjs`
- 25/25 checks passed.

It creates two real sessions in one group, compacts both, and verifies:

- distinct ledger files;
- exact envelope and entry binding;
- no sibling-session identity in serialized ledgers;
- v2 compact receipts and distinct compact epochs;
- v1 exact-session receipt read compatibility;
- Memory Center exact-session hook selection;
- legacy `default` fail-closed behavior;
- mixed-session tamper rejection;
- unreadable-ledger rejection;
- group-only v1 ledger non-migration.

Regression evidence:

- group auto-compaction session scope: 12/12 passed;
- task-agent compact-head fence: 38/38 passed;
- Phase 291 body-free diagnostic export: 46/46 passed;
- Memory Center session scope: 13/13 passed;
- compact module built-in suite: 19/19 passed;
- Memory Center hook ledger fixture: 4/4 passed;
- Memory Center boundary replay fixture: 7/7 passed.

Full `npm run build` passed. Focused `git diff --check` passed with only existing CRLF conversion warnings.

## Production Evidence

- production URL: `http://localhost:3081`;
- server PID after deployment: `24960`;
- root HTTP status: 200;
- Memory Center Overview HTTP status: 200;
- legacy diagnostic export request: 400 with exact `gcs_*` scope required;
- production stderr: empty;
- legacy Session Memory scopes after authorized cleanup: 0;
- legacy Tool Continuity scopes after authorized cleanup: 0;
- legacy typed-memory directories after authorized cleanup: 0;
- group-only compact/replay sidecar files after authorized cleanup: 0;
- exact Session Memory scopes preserved: 4.

The cleanup removed 2,369 legacy memory artifact directories and 96 group-only sidecar files. It was restricted to the memory artifact roots and preserved exact `--gcs_*` directories plus new `<group>/<gcs_*>.json` sidecars.

## Ownership Boundary

The group-chat main Agent owns compact state for one exact conversation. Project child Agents may receive memory derived from that exact conversation through the existing worker-context delivery contract. Another conversation's compact hooks, receipt, boundary, replay state, or repair work items cannot become evidence for the current conversation. The Global Agent remains outside this ownership chain.

## Long-Term Direction

The Claude Code parity goal remains active. The next audit should continue from current reference-source behavior, with particular attention to resume-time compact boundary reconstruction and offline verification tooling that cannot enter Agent context or authorize memory mutation.
