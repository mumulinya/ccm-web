# Phase 295: Compact Restart Round-Trip Recovery

## Status

- Date: 2026-07-15
- Result: completed
- Scope: compact transaction crash window, compact-head reconciliation, write-load consistency, real process restart soak

## Claude Code parity source

Claude Code `D:\claude-code\src\utils\sessionStorage.ts:2209-2244` implements `checkResumeConsistency()` to monitor write-to-load round-trip drift. Its checkpoint compares the active message count recorded in-session with the chain reconstructed after resume.

The source identifies both dangerous directions:

- positive delta: resume loaded more history than was active before exit
- negative delta: resume lost part of the active chain

This protects the same compact/snip persistence boundary addressed by Phase 293 and Phase 294.

## CCM gap found

The auto-compaction commit sequence was:

1. Build a checksummed compact transaction receipt.
2. Save group-session memory.
3. Commit the compact boundary journal from `saveGroupMemory()`.
4. Commit the exact-session compact-head.

A process exit between steps 3 and 4 left a valid memory snapshot and boundary journal but no compact-head. Resume projection remained valid, while a newly created child-Agent packet could still bind to a missing or stale compact-head.

## Implementation

### Journal-backed compact-head restart recovery

`reconcileGroupCompactHeadFromMemory()` now reconciles a missing head only when all durable evidence agrees:

- exact `groupId + gcs_*` scope
- valid compact transaction receipt checksum
- receipt boundary and compact epoch
- receipt summary checksum
- valid latest boundary journal commit
- journal boundary and summary matching the receipt

If the current head already matches, reconciliation is idempotent and does not advance its generation. Invalid receipts, invalid journals, and identity mismatches fail closed. A tampered receipt cannot replace or advance an existing head.

`prepareGroupMemoryResumeProjection()` performs reconciliation after projection verification. Both group-main and child-Agent context construction then read the recovered head. The recovery audit is copied into the body-free resume proof.

### Resume round-trip consistency

Every verified boundary projection now records `ccm-group-memory-resume-consistency-v1`:

```text
expected_active = committed_preserved + appended_since_checkpoint - replayed_snip_removals
delta = actual_projected - expected_active
```

The audit includes checkpoint count, expected count, actual count, delta, status, and checksum. It is rendered into group-main and child-Agent memory context packets.

## Real crash/restart soak

`scripts/group-memory-compact-restart-soak-selftest.mjs` launches two isolated Node processes using a temporary home directory.

The first process:

- creates and compacts a real `gcs_*` transcript
- persists memory and boundary journal
- verifies compact-head is still absent
- exits intentionally with status 73 before head commit

The second process:

- loads only durable files from disk
- verifies no head exists before resume
- resumes and reconstructs generation 1 compact-head
- resumes a second time and proves generation remains 1
- attempts reconciliation with a tampered receipt and proves fail-closed behavior
- builds a real child-Agent context bundle bound to the recovered head
- verifies boundary journal count, raw transcript count, and round-trip delta remain unchanged

## Regression evidence

- Phase 295 restart soak: 11/11
- Phase 294 snip replay: 11/11
- Phase 293 resume integration: 12/12
- Boundary journal: 16/16
- Phase 292 exact-session hook isolation: 25/25
- Multi-session auto compaction: 12/12
- Compact-head fence: 38/38
- Memory Center session scope: 13/13
- Compaction unit suite: 14/14
- Compaction hook suite: 9/9
- Compaction integration suite: 11/11
- Compaction stress suite: 8/8
- `npm run build:backend`: passed
- Full `npm run build`: passed
- Production `http://localhost:3081/`: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200
- Production PID: `9784`
- stderr: empty
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase295.log` and `C:\Users\admin\.cc-connect\logs\ccm-server-phase295.err.log`

## Long-term goal state

Phase 295 closes the verified compact transaction crash window and adds write-load consistency evidence comparable to current Claude Code. The long-term goal remains active for provider-native compact execution and future upstream audits.
