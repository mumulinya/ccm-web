# Phase 294: Durable Resume Snip Replay

## Status

- Date: 2026-07-15
- Result: completed
- Scope: exact group-session snip markers, middle-range resume filtering, parent-chain relinking, effective-token accounting

## Claude Code parity source

Claude Code `D:\claude-code\src\utils\sessionStorage.ts:1961-2040` implements `applySnipRemovals()` when loading an append-only transcript.

The relevant invariants are:

1. Snip removes middle ranges, while normal compact truncates a prefix.
2. Removed messages remain on disk as durable raw evidence.
3. Resume must not reconstruct the removed range into active model context.
4. A surviving message whose parent points into the removed range must be relinked to the first surviving ancestor.
5. Older boundaries without an explicit removed-ID list are skipped.

The Claude Code source documents a real failure shape where 397K displayed tokens became 1.65M actual tokens after resume because pre-snip history was reconstructed.

## CCM implementation

### Exact-session durable marker

`buildGroupMemorySnipBoundaryMarker()` creates `ccm-group-history-snip-boundary-v1` markers containing:

- exact `groupId + gcs_*` identity
- sorted removed message IDs
- removed-ID checksum
- reason and creation time
- parent identity for append-only chain continuity

Legacy/default-session marker creation is rejected. `appendGroupMemorySnipBoundaryMarker()` validates that requested IDs exist in the exact session before appending the marker through normal group-message persistence.

### Resume projection v2

`ccm-group-memory-resume-projection-v2` scans transcript markers and retained compact-boundary metadata before constructing active context.

- Multiple snip markers are unioned.
- Cross-session markers are rejected per marker.
- Checksum-mismatched markers are rejected per marker.
- Legacy markers without removed IDs are skipped, matching Claude Code behavior.
- Removed messages are filtered from cloned projection data only.
- Dangling `parentUuid`, `parent_uuid`, `parentMessageId`, and `parent_message_id` links are walked backward through removed ranges and relinked.
- Cycles terminate at a null chain root instead of looping.
- The raw transcript is never mutated.

Snip replay works both with and without a normal compact boundary. With a compact boundary, prefix omission and middle-range omission are tracked separately.

### Token pressure and child-Agent use

The Phase 293 effective-token baseline now records:

- prefix-omitted message/token counts
- snip-removed message/token counts
- parent relink count
- snip removal checksum
- summary plus projected effective tokens

The same body-free audit is stored in resume proofs and rendered into group-main and child-Agent context packets. Removed message bodies and removed ID lists are not copied into diagnostic proof ledgers.

## Regression evidence

- Phase 294 snip replay: 11/11
- Boundary journal: 16/16
- Phase 293 resume integration: 12/12
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
- Production PID: `19112`
- stderr: empty
- Logs: `C:\Users\admin\.cc-connect\logs\ccm-server-phase294.log` and `C:\Users\admin\.cc-connect\logs\ccm-server-phase294.err.log`

The Phase 294 test proves multi-marker union replay, two independent parent relinks, no-boundary replay, exact-session isolation, malformed marker handling, body-free proofs, raw-transcript immutability, and effective-token reduction for three large removed messages.

## Long-term goal state

Phase 294 closes the durable middle-range snip restoration gap in the current Claude Code source audit. The long-term parity goal remains active for further source changes, crash/restart soak, and provider-native compaction behavior.
