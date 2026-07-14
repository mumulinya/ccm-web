# Phase 223 - Durable Compact Boundary and Resume Projection

Date: 2026-07-13

## Objective

Close the gap between CCM's in-memory compact boundary metadata and Claude Code's durable compact/resume behavior.

The required architecture remains:

- A group chat is a container with multiple independent `gcs_*` sessions.
- Every group chat session owns its transcript, memory JSON, typed memory, compact boundary, resume proof and child-Agent context.
- A project child Agent receives only the memory of the group chat session that created its task.
- The Global Agent continues to use global memory and routing/task state; it does not receive group-session transcript bodies.
- Legacy `default` single-session data is deleted instead of migrated.

## Claude Code Parity Result

CCM now persists a session-scoped compact boundary sidecar after the memory snapshot has been written. Resume no longer trusts `memory.compactBoundary` by itself.

Each committed boundary records:

- group ID and group session ID;
- boundary ID, sequence and fencing token;
- summary checksum and boundary checksum;
- summarized-through message ID;
- preserved segment head, tail, count and ID suffix;
- raw transcript message count, byte size and checksum;
- committed transcript-prefix checksum through the preserved tail;
- durable row checksum, commit ID, timestamp and owner PID.

The write order is intentional:

1. Save the compacted memory snapshot.
2. Fsync and commit the boundary journal row.

This preserves a real crash window. If the process dies after step 1 and before step 2, resume detects an uncommitted memory boundary and fails closed.

## Resume Algorithm

Before group-main-Agent or child-Agent context construction, CCM now:

1. Loads the current session raw transcript and memory snapshot.
2. Reads the latest valid committed boundary for that exact group/session pair.
3. Verifies journal row checksum, scope identity, boundary checksum and summary checksum.
4. Verifies summarized-through, preserved head and preserved tail are present and contiguous.
5. Verifies preserved count, declared ID suffix and committed transcript-prefix checksum.
6. On success, constructs a projection containing:
   - compact summary;
   - preserved raw segment;
   - messages appended after the committed preserved tail.
7. Omits the already summarized raw prefix from the active model context.
8. Writes a durable resume projection proof.

Failure is fail-closed. A missing commit, damaged journal, tampered summary, missing head/tail, truncated transcript or cross-session mismatch disables pruning and rebuilds memory from the full current raw transcript. Damaged journals are quarantined. The rebuilt boundary receives a new committed row and recovery proof.

Repeated resume with an unchanged logical boundary reuses the boundary ID and does not append journal churn.

## Context Integration

`buildAgentMemoryContextBundle` now exposes:

- `compaction.resumeProjection`;
- durable journal and proof paths;
- recovery status and recovery reason;
- raw, omitted, preserved, appended and projected message counts;
- the verified projected raw window in `resume_context` and `rendered_text`.

`buildGroupContextPacket` uses the same verified projection. Pre-boundary raw messages are not loaded again after a valid resume, while the complete raw JSON remains the source of truth for targeted recovery.

Compact source manifests and compact file-reference/read-plan ledgers now use session memory, session transcript and session typed-memory paths. Session-scoped ledgers use the `groupId--sessionId` scope key so one session cannot overwrite another session's compact read plan.

## Memory Center

Memory Center now scans both legacy group memory and `group-memory-sessions/<group>/<session>.json`.

Every session appears as an independent scope such as:

`gmps7ha15::gcs_mrhk9qcz_zkwcvm`

The scope carries separate controls and evidence identity. Group-session evidence lookup reads only that session transcript.

The compact-boundary view now shows a Durable Resume panel with:

- resume status and validation state;
- group/session identity;
- raw, omitted and projected message counts;
- boundary sequence and fencing token;
- proof count and proof-ledger validity;
- journal path and fail-closed reason.

Memory Center manual compact/rebuild operations now pass the selected group session ID to the real compaction entry point.

The App tab mounting race was also fixed by adding the target tab before changing `currentTab`. The Memory Center pane now mounts on the first click.

## Legacy Cleanup

The new `purgeLegacyDefaultGroupChatSession` operation removes legacy `default` transcript rows and manifest entries. The group session API exposes it as `action=purge_legacy`; memory artifacts are deleted through the existing session artifact boundary.

Production cleanup completed:

- removed empty `default` entries from `gmqbz18hj` and `gmr02wpbv`;
- deleted 25 legacy default memory, typed-memory and continuity files;
- left all `gcs_*` sessions intact;
- root legacy group transcript files remaining: 0;
- root legacy group memory files remaining: 0;
- manifests containing `default`: 0.

Four current `gcs_*` sessions now have clean session-scoped initial memory/proof snapshots.

## Files

Primary implementation:

- `backend/modules/collaboration/group-memory-boundary-journal.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/storage.ts`
- `backend/modules/collaboration/group-routes.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/App.vue`
- `frontend/src/components/knowledge/MemoryCenter.vue`

Tests:

- `scripts/group-memory-boundary-journal-selftest.mjs`
- `scripts/group-memory-resume-integration-selftest.mjs`
- `scripts/memory-center-session-scope-selftest.mjs`

Build compatibility:

- `backend/modules/collaboration/test-agent-runner.ts` received only an explicit `string[]`/`Set<string>` type annotation so the concurrently added file does not block the backend build. Runtime behavior is unchanged.

## Verification

Passed:

- boundary journal fault matrix: 14/14;
- end-to-end save/commit/resume/rebuild matrix: 7/7;
- Memory Center session-scope matrix: 5/5;
- group chat session lifecycle matrix: 12/12;
- model capability recovery regression: 13/13;
- model capability cache regression: 27/27 plus unit/native-receipt checks;
- refresh lease race regression: 6/6;
- TypeScript backend build;
- Vite frontend production build.

Browser acceptance at `http://localhost:3081` confirmed:

- Memory Center pane mounts on first click;
- four group sessions appear as independent memory scopes;
- Durable Resume panel renders without overlap;
- `no_boundary` empty sessions show a valid proof;
- group memory and transcript references point to session-scoped paths;
- no frontend console errors.

Production server after final restart:

- URL: `http://localhost:3081`
- PID: `11672`

## Remaining Long-Term Work

The long-term Claude Code parity goal remains active.

Recommended next phase:

- move the remaining group-wide post-compact dispatch/candidate/replay sidecars to explicit session scope;
- add journal retention/compaction and cross-process commit recovery metrics;
- make Memory Center quality reports enumerate session memories instead of relying on legacy root group files;
- add task-session receipts proving that the exact resume projection checksum reached the third-party native session;
- compare CCM projection/relink behavior against additional Claude Code interrupted tool-use and branched transcript fixtures.
