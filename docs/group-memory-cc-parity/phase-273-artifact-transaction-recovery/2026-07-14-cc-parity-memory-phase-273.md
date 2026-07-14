# CCM Group Memory CC Parity - Phase 273

Date: 2026-07-14

## Objective

Make one group-session typed-memory mutation recoverable across all correlated durable artifacts:

- typed topic Markdown;
- the `MEMORY.md` entrypoint;
- `.distillation-ledger.json`.

The transaction remains scoped to the exact `groupId--gcs_*` identity. A child Agent must never receive a topic document, index, and ledger assembled from different partial commits.

## Claude Code Reference

Claude Code protects an individual memory file with:

- a temporary file in the target directory;
- a flushed write;
- permission preservation;
- atomic rename;
- extraction cursor advancement only after a successful extraction run;
- a trailing extraction when new context arrives during an active extraction.

CCM retains the same per-file atomic write principle. CCM additionally needs a multi-file protocol because deterministic archive writers generate topic files, `MEMORY.md`, and a shared ledger in one logical mutation and may run in separate processes.

## Artifact Transaction Protocol

Each exact group-session scope may own:

- `.distillation-artifact-transaction.json`;
- `.distillation-artifact-stage/<leaseId>/before-*.bin`;
- `.distillation-artifact-stage/<leaseId>/after-*.bin`.

The journal contains only bounded metadata, checksums, target basenames, ordering, lease identity, and fence. Large memory bodies remain in stage files and are never embedded in the journal.

### Prepare

During a mutation, topic and ledger writes enter an in-memory staged overlay. Scans, quality evaluation, and `MEMORY.md` generation see that overlay, so the index is built from the exact topic versions that will be committed.

Before publishing any target, CCM durably writes:

- each target's before image when it exists;
- each intended after image when it is not a deletion;
- SHA-256 checksums and byte counts;
- a checksummed `prepared` journal bound to the active lease and fencing token.

### Commit marker

Artifacts publish in this order:

1. topic Markdown files;
2. `MEMORY.md`;
3. `.distillation-ledger.json`.

The ledger is the final commit marker. Every target still uses temp-file, flush, and atomic rename semantics. The completed journal is marked `committed`, all target checksums are verified, and stage files are removed.

### Recovery decision

If a process dies while the journal is `prepared`:

- ledger lease/fence does not match the journal: restore every before image in reverse order;
- ledger lease/fence matches the journal: publish and verify every after image;
- stage or journal checksum is invalid: fail closed without inventing a commit.

Recovery is idempotent and runs under the same scoped distillation lease.

## Recovery Barriers

Recovery is not deferred indefinitely:

- a later writer recovers before starting its mutation;
- server startup scans every `groupId--gcs_*` journal before task queues resume;
- every public typed-memory document scan and child-context recall uses a read barrier;
- a read barrier waits for an active remote writer or recovers an abandoned prepared transaction;
- a local active mutation reads its staged overlay instead of deadlocking itself.

This prevents an external maintenance-process crash from exposing partial memory while the main server remains online.

## Memory Center

The existing memory transaction diagnostics now include:

- artifact transaction status;
- journal and checksum validity;
- mutation kind and fencing token;
- target count and target names;
- rollback or rollforward action;
- prepare, commit, and recovery timestamps.

## Main Files

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/server.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-typed-memory-artifact-transaction-selftest.mjs`
- `scripts/memory-center-session-scope-selftest.mjs`
- `package.json`

## Verification

Phase 273 real-process fault injection: 13/13 passed.

- normal mutation publishes topic, index, and ledger together;
- normal completion removes stage data;
- forced process death after topic publication but before ledger publication rolls back;
- replacement mutation commits after rollback;
- forced process death after ledger publication but before journal completion rolls forward;
- rollforward preserves the committed archive and allows a later archive to extend it;
- recovered `MEMORY.md` links match durable topic files;
- startup fleet recovery repairs a prepared transaction before recall;
- read barrier repairs a prepared transaction before child-context scanning;
- synchronous commit failure rolls back immediately;
- failed mutations release the lease;
- tampered stage content fails closed;
- failed corrupt recovery does not invent a new ledger commit.

Observed fault evidence:

- pre-ledger crash fence: `1784013829698716`
- recovery action: `rollback_before_uncommitted_ledger_fence`
- committed-ledger crash fence: `1784013830351336`
- recovery action: `rollforward_from_committed_ledger_fence`

Regression evidence:

- all 15 exported group typed-memory module self-tests passed;
- Phase 272 shared-ledger multi-process test passed 15/15;
- Phase 271 fencing test passed 13/13;
- direct remember/forget passed 9/9;
- incremental cursor passed 13/13;
- write admission passed 22/22;
- positive-feedback lifecycle passed 19/19;
- session recall passed 20/20;
- dispatch WAL and legacy purge passed 39/39;
- group-session artifact retention passed 13/13;
- Memory Center session-scope diagnostics passed 13/13;
- full frontend, MCP integration, and backend build passed.

## Production State

- URL: `http://localhost:3081`
- PID: `18656`
- HTTP status: `200`
- lifecycle heads: 2 checked, 2 valid, 0 failed
- lifecycle identities: only the two real `gmqbz18hj--gcs_*` sessions
- active distillation locks: 0
- prepared or corrupt artifact journals: 0
- artifact stage directories: 0
- stderr: empty

Legacy cleanup performed during this phase:

- 13 leaked self-test lifecycle heads removed;
- 50 historical `memory-center-session-*` self-test directories removed;
- the Memory Center session-scope self-test now removes its lifecycle head, journal, and commit artifacts;
- no real `gcs_*` session was deleted.

## Stable Invariants

1. One group-chat session owns one typed-memory directory and transaction domain.
2. Topic Markdown, `MEMORY.md`, and the ledger share one recoverable commit decision.
3. The ledger fence is the durable commit marker, not file modification time.
4. Recall cannot pass a prepared or corrupt artifact transaction to a child Agent.
5. The Global Agent remains global-context-only and does not consume group-session artifacts.
6. Legacy `default` sessions are deleted without migration.

## Remaining Long-Term Work

The Claude Code parity goal remains active. Further work remains on bounded artifact-journal history and operational repair controls, model-assisted memory proposal admission with explicit provenance, and long-running real-provider validation that every fresh third-party child-Agent session receives and acknowledges only its owning `groupId + gcs_*` memory context.
