# Phase 397: Post-compact Provider usage atomic replace

Date: 2026-07-18

> Phase 399 simplified the persisted admission audit to one checksum-protected `providerContextUsageBaselineAdmitted` boolean. The current-snapshot admission and monotonic canonical-delivery invariants remain unchanged. The current focused result is `31/31`; the `33/33` result below records the original, more verbose audit representation.

## Goal

Make the first trustworthy Provider response after compaction atomically replace the stale usage baseline for the current task-Agent snapshot. A delayed response from an older snapshot or compact lineage must remain auditable without overwriting the new baseline or redirecting session-level canonical delivery state.

The scope remains exact:

```text
groupId + gcs_* + taskId + tas_* + current snapshot
        + provider/model/runtime identity + compact epoch/head
```

## Claude Code reference

Claude Code's `tokenCountWithEstimation()` in `D:/claude-code/src/utils/tokens.ts:230` uses the latest usage-bearing API response still in the active message lineage and estimates only messages that follow it. Compaction constructs a replacement message array in `D:/claude-code/src/services/compact/compact.ts:332`, while `D:/claude-code/src/services/compact/autoCompact.ts:294` and `:323` reset cursors whose message IDs no longer exist.

For CCM's asynchronous third-party Agent calls, the equivalent requirement is stronger than compact-lineage matching alone: only a response bound to the task session's current snapshot can become the new latest usage anchor.

## Race defects found

Phase 397's real race test exposed two defects in the prior delivery path.

First, Provider usage could construct a baseline candidate even when the delivery snapshot had become stale. The compact-head fence rejected the task artifact, but the candidate could still replace the session baseline. A later old response could therefore overwrite a fresh post-compact baseline or clear it by verifying the fresh baseline against the old delivery lineage.

Second, per-snapshot canonical receipts were monotonic, but every delivery copied that snapshot's canonical receipt into session-level fields. A delayed response for snapshot A could make `memoryContextDeliveryReceiptId` point back to A even while `memoryContextSnapshotId` and the current Provider baseline belonged to newer snapshot B.

This created a split session state:

```text
current snapshot = B
Provider usage baseline = B
session canonical delivery = A
```

## Baseline admission

A reported usage receipt may now replace `TaskAgentSession.providerContextUsageBaseline` only when all admission conditions pass inside the task-session store lock:

- Provider model identity is known;
- rendered prompt is bound to the delivery snapshot;
- memory-delivery evidence is ready;
- Provider execution succeeded and the runner started;
- final-dispatch gate is valid and allowed the Provider call;
- delivery snapshot equals the session's current `memoryContextSnapshotId`;
- compact-head fence is current;
- group-session lifecycle fence is current.

Admission states are persisted on the receipt and session:

- `replaced`: admitted usage atomically became the current baseline;
- `preserved`: no new admitted usage and a valid baseline remained;
- `rejected_preserved`: reported usage was stale or unbound, so the valid current baseline was retained;
- `rejected_empty`: stale or unbound usage was rejected and no valid prior baseline existed;
- `none`: neither new usage nor a prior baseline existed.

Admission issues are body-free and checksum-protected in each delivery receipt.

## Monotonic current snapshot

Rejected usage no longer verifies the current baseline against the rejected delivery's Provider or compact lineage. It performs integrity verification on the existing exact-session baseline and preserves it when valid. Production dispatch still applies the full current model/runtime/compact-lineage checks before using that preserved baseline.

After updating the delivered snapshot's own ref, session-level canonical delivery and sync-commit fields are now selected from the ref matching the session's current `memoryContextSnapshotId`. Delayed snapshot A may update A's latest-attempt evidence, but it cannot redirect current snapshot B's canonical receipt.

The same locked session save therefore commits the current snapshot reference, current canonical delivery reference, Provider baseline, admission status, and latest-attempt audit without a cross-snapshot split.

## Verification

Phase 397 command:

```text
npm run test:final-dispatch-provider-usage-post-compact-atomic-replace-restart
```

Focused result: `33/33`.

The isolated test performs the complete race:

- creates a calibrated precompact Codex task session;
- executes a real 72-message group compact and commits durable head generation 1;
- creates post-compact snapshot A and newer snapshot B in the same compact lineage;
- records a successful Provider usage response for current snapshot B;
- proves B's baseline, canonical delivery, and current snapshot commit together;
- returns snapshot A's larger usage late and verifies `delivery_snapshot_not_current`;
- returns the precompact Provider response even later and verifies `compact_head_stale` plus current-snapshot rejection;
- proves neither delayed response changes B's baseline checksum;
- proves neither delayed response redirects the session canonical delivery away from B;
- verifies all accepted and rejected receipts by checksum;
- verifies Memory Center clears `stale_after_compact` for current snapshot B;
- verifies sibling isolation and restart-stable checksums.

Compatibility verification completed in this phase:

- Phase 396 compact-lineage baseline: `32/32`;
- Phase 395 Provider model/runtime identity gate: `23/23`;
- Phase 394 Provider usage preflight feedback: `37/37`;
- Phase 351 snapshot-sync monotonic commit: `22/22`;
- backend production build: passed.

The first full emit attempt encountered an intermittent Windows `TS5033 UNKNOWN open` on unrelated `test-agent/browser` declaration files. The next complete `build:backend` run exited successfully. The failed emit was not counted as verification.

Phase 376-397 focused memory chain: `899/899`.

Targeted memory checks through Phase 397: `1755/1755`.

No paid Provider call was made. Provider responses, compact transaction, durable head, snapshot races, restart, and checksum evidence used deterministic isolated fixtures.

## Result

The post-compact usage anchor is now monotonic with the current task-Agent snapshot. Fresh Provider usage replaces the stale baseline once; older same-lineage or precompact responses remain visible as rejected attempts but cannot move capacity authority or canonical delivery state backward.

The long-term Claude Code parity goal remains active. The next audit should examine crash recovery between writing a newly admitted delivery receipt and atomically saving its session reference, including orphan-receipt reconciliation after restart.
