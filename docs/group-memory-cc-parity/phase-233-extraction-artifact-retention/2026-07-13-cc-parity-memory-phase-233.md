# CCM Memory CC Parity Phase 233

## Scope

This phase bounds forked model Session Memory extraction artifacts per independent group chat session.

- Each `groupId--gcs_*` scope owns its hot artifacts, cold archive, retention manifest and lock.
- Existing group chat sessions are not migrated. Old sessions may be deleted directly; session deletion removes both hot and cold evidence.
- Child Agents continue to receive only the owning session's bounded Session Memory.
- Global Agent receives no group Session Memory body, extraction artifact body, archive path or manifest.

## Claude Code Reference

Audited source:

- `D:/claude-code/src/services/SessionMemory/sessionMemoryUtils.ts`
- `D:/claude-code/src/services/SessionMemory/sessionMemory.ts`
- `D:/claude-code/src/services/SessionMemory/prompts.ts`
- `D:/claude-code/src/services/compact/*`
- `D:/claude-code/src/utils/sessionStorage.ts`

Claude Code keeps Session Memory as a bounded live file, uses the same context-growth metric as auto compact, and defaults to initialization at 10,000 tokens, update growth at 5,000 tokens and three tool calls. Its transcript persistence honors `cleanupPeriodDays`, no-session-persistence and test suppression. Post-compact cleanup clears transient state rather than deleting the live Session Memory.

CCM already matched the live Session Memory budget and cadence. The remaining gap was CCM-specific replay evidence: `model-extraction-history.jsonl` was bounded only while reading, while compressed request/result artifacts could grow without a storage policy.

## Implementation

### Checksummed per-session cold storage

`group-session-memory-model-extraction.ts` now provides:

- `inspectGroupSessionMemoryModelExtractionArtifactRetention`
- `runGroupSessionMemoryModelExtractionArtifactRetention`
- `readGroupSessionMemoryModelExtractionArtifactRetentionManifest`
- hot-or-cold transparent artifact reads

The manifest schema is `ccm-group-session-memory-model-extraction-artifact-retention-manifest-v1`. Every entry binds:

- exact scope, execution ID and artifact kind
- terminal status, sequence and terminal time
- artifact checksum and compressed-file SHA-256
- compressed byte count
- original hot path and deterministic cold path
- archive reason and archive time

The manifest itself is checksummed. Replay fails closed when the manifest, scope binding, compressed bytes or artifact checksum is changed.

### Retention rules

Defaults are user configurable in Memory Center:

- automatic cold archival: enabled
- hot terminal executions: 50
- hot bytes: 64 MB
- hot age: 30 days

The policy always protects:

- the latest committed extraction
- the latest failed extraction
- current success/failure receipt executions
- an execution with an open attempt

History JSONL remains append-only. Only bulky gzip request/result artifacts move to cold storage. Artifact storage does not change the model context budget: injected Session Memory remains capped at 12,000 total tokens and 2,000 tokens per section.

### Crash and concurrency safety

Archival uses a copy, verify, manifest commit, hot-delete protocol:

1. Copy each candidate to its deterministic cold path.
2. Verify gzip, scope binding, artifact checksum and compressed checksum.
3. Atomically commit the next checksummed manifest generation.
4. Delete hot copies only after the manifest is readable and valid.

A crash before manifest commit leaves the hot source authoritative. A crash after manifest commit leaves either a harmless duplicate or a valid cold copy. A later run is idempotent and completes cleanup. A per-session cross-process lock has stale-owner recovery.

### Memory Center

The context settings panel now exposes artifact auto archive, hot execution count, hot MB and hot days. Session Memory fleet rows show hot/cold bytes, archive candidates and manifest health. Each session has preview and execute actions. Replay reports whether request and result came from `hot` or `archive` storage.

The maintenance API resolves the requested session against the live fleet and accepts only an independent `groupId::gcs_*` scope. A manual apply requires explicit confirmation and writes a memory audit event.

### Deletion

`deleteGroupSessionMemoryArtifacts` already recursively owns the complete `group-session-memory/<groupId--gcs_*>` directory. The new archive directory, manifest, temporary copies and retention lock therefore disappear with the session. No legacy `default` session is created or migrated.

## Verification

New test: `scripts/group-session-memory-artifact-retention-selftest.mjs`

Passed 13/13:

1. Old executions appear in dry-run.
2. Copy-first interrupted archival recovers.
3. Manifest binds archive checksums.
4. Latest success and failure remain hot.
5. Archived artifacts read from cold storage.
6. Full extraction replay works from cold storage.
7. Tampered archive fails closed.
8. Tampered manifest fails closed.
9. Two concurrent processes are idempotent.
10. Session B is unchanged by session A retention.
11. Global Agent receives no archive body or path.
12. Legacy `default` remains absent.
13. Session deletion removes hot, cold, manifest and lock artifacts.

Regression suites passed:

- fact supersession: 13/13
- extraction chain/replay: 12/12
- cold recovery/history: 9/9
- model extraction: 12/12
- cadence: 17/17
- extraction transaction: 11/11
- delivery/fencing: 13/13
- budget/fleet: 12/12
- Memory Center session scope: 5/5
- `npm run check`
- frontend production build

Production UI QA:

- desktop `1440 x 1000`: 14 settings fields, 0 overlaps, 0 horizontal overflow
- mobile `390 x 844`: artifact controls use one column, 0 overlaps, 0 control overflow, 0 horizontal overflow
- browser console: 0 warnings, 0 errors

## Production

- URL: `http://localhost:3081`
- PID: `22320`
- retention defaults: auto enabled, 50 hot executions, 64 MB hot capacity, 30 hot days
- groups: 3
- sessions: 3 fresh active `gcs_*` sessions, each with 0 messages
- legacy `default`: 0
- archived old sessions: 0
- artifact manifest invalid: 0
- artifact capacity exceeded: 0
- Phase 233 self-test residue: 0

## Result

Phase 233 closes unbounded model-extraction artifact growth without weakening replay or mixing group sessions. The long-term Claude Code parity goal remains active; this phase does not mark the memory system complete.
