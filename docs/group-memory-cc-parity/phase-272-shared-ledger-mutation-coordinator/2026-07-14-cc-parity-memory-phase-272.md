# CCM Group Memory CC Parity - Phase 272

Date: 2026-07-14

## Objective

Extend the Phase 271 cross-process transaction boundary from group-log distillation to every writer of the shared `.distillation-ledger.json` file. Concurrent archive maintenance, direct memory, recall-time catch-up, and long-term log distillation must not overwrite unrelated facts or archive keys.

The lock identity remains exact and session-bound:

`groupId + groupSessionId -> groupId--gcs_*`

Different group-session scopes remain independently writable.

## Shared Mutation Coordinator

Phase 272 adds one reentrant, process-local coordinator backed by the existing Phase 271 filesystem lease:

- first mutation for a scope obtains `.distillation-transaction.lock`;
- nested mutations in the same process and scope reuse the same lease and fence;
- another process writing the same scope waits for the lease;
- another scope acquires its own lease without waiting;
- every ledger write renews and re-verifies lease ownership;
- a lower-fence writer cannot overwrite a ledger committed by a higher fence;
- a write outside the coordinator fails closed with `uncoordinated_group_typed_memory_distillation_ledger_write`.

The coordinator covers group-log distillation and 18 shared archive writers, including provider proof/ranking, post-compact reinjection and preservation, conflict resolution, ignore-memory repair, context-pressure provenance, compact strategy, and PTL emergency downgrade archives.

## Mutation Proof

Every successful archive API now returns `distillationMutation` with:

- outer and nested mutation kinds;
- lease ID and fencing token;
- actual contention wait;
- abandoned-lease recovery count;
- ledger write count;
- acquisition and completion timestamps;
- final status.

The same identity is committed into `.distillation-ledger.json` and `.distillation-transaction-state.json`. State checksums now cover mutation kinds, wait time, and write count. Fence recovery considers either the latest `distillationMutation` proof or the older `distillationTransaction` proof, preventing rollback after damaged state recovery.

## Legacy Session Policy

Legacy `default` group-chat sessions are deleted and never migrated into a new `gcs_*` session.

- startup maintenance policy remains `delete_legacy_default_without_migration`;
- legacy sessions cannot enter child-Agent dispatch or the typed-memory WAL;
- runtime memory writes reject non-`gcs_*` group sessions;
- six remaining legacy default self-test artifacts were deleted during this phase;
- a runtime scan after cleanup found no JSON or JSONL `default` group-session records;
- all existing `gcs_*` sessions were retained unchanged.

## Main Files

- `backend/modules/collaboration/group-memory-index.ts`
- `scripts/group-typed-memory-shared-ledger-mutation-selftest.mjs`

## Verification

Phase 272 real multi-process and reentrant test: 15/15 passed.

- two archive writers on one scope serialize;
- the second archive writer records a real nonzero wait;
- archive fences increase monotonically;
- unrelated context-usage and PTL archive keys both survive;
- group-log/direct-memory facts and a concurrent archive both survive;
- transaction state binds the final ledger lease, fence, and mutation kind;
- a force-killed archive owner becomes stale;
- the crashed archive does not commit;
- recovery raises the fence and commits the replacement archive;
- two different `groupId--gcs_*` scopes run concurrently without lock wait;
- a nested mutation reuses one lease and records both mutation kinds;
- an uncoordinated ledger write fails closed.

Observed Phase 272 evidence:

- archive first fence: `1784011208837080`
- archive second fence: `1784011209859108`
- archive second wait: approximately `673 ms`
- mixed log/archive first fence: `1784011210108528`
- mixed log/archive second fence: `1784011211133708`
- mixed second wait: approximately `673 ms`
- abandoned archive fence: `1784011211371732`
- recovery fence: `1784011211583092`
- recovered leases: `1`

Regression results:

- Phase 271 transaction fencing: 13/13 passed;
- direct remember/forget: 9/9 passed;
- incremental cursor: 13/13 passed;
- long-term write admission: 22/22 passed;
- positive feedback admission: 21/21 passed;
- positive feedback lifecycle: 19/19 passed;
- session lifecycle anti-rollback: 38/38 passed;
- typed-memory session recall: 20/20 passed;
- child typed-memory dispatch WAL and legacy purge: 39/39 passed;
- complete frontend, MCP integration, and backend build: passed.

Production service:

- URL: `http://localhost:3081`
- PID: `19380`
- HTTP response: `200`
- lifecycle heads: 13 checked, 13 valid, 0 failed
- residual distillation locks: 0
- stderr: empty

## Stable Invariants

1. One group-chat session owns one memory scope; no shared group-wide default memory is used.
2. Child Agents receive only the current `groupId + gcs_*` memory context, even though each child execution creates a fresh third-party session.
3. The Global Agent consumes global context only and does not inherit group-chat transcripts.
4. Shared typed-memory ledger mutations are serialized per scope, not globally.
5. Old default sessions are deleted without content migration.

## Remaining Long-Term Work

The Claude Code parity goal remains active. The next useful hardening step is transactionally coordinating the Markdown document/index side of archive writes with the ledger commit, so a crash between document upsert and ledger commit can be detected and repaired as one recoverable mutation. Broader real-provider soak tests and model-assisted memory proposal admission also remain ongoing parity work.
