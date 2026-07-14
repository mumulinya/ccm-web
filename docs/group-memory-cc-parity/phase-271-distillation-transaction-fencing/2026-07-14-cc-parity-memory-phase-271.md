# CCM Group Memory CC Parity - Phase 271

Date: 2026-07-14

## Objective

Prevent concurrent direct-memory writes, background group-log distillation, and recall-time catch-up from overwriting each other when they update the same group-session typed-memory ledger.

The transaction identity is the existing typed-memory scope:

`groupId + groupSessionId -> groupId--groupSessionId`

## Claude Code Reference

Claude Code's `extractMemories` path serializes extraction inside one process with:

- an `inProgress` flag;
- a latest `pendingContext` slot;
- a trailing extraction after the active extraction finishes;
- an incremental `lastMemoryMessageUuid` cursor;
- graceful draining of in-flight extraction before shutdown.

CCM needs a stronger boundary because group-session memory may be touched by the HTTP main Agent, background hooks, recall-time catch-up, test/maintenance processes, and multiple server processes. Phase 271 therefore retains incremental/coalesced behavior and adds a filesystem-backed cross-process transaction.

## Transaction Protocol

### Exclusive scoped lease

Each typed-memory scope now owns:

- `.distillation-transaction.lock`
- `.distillation-transaction-state.json`
- `.distillation-ledger.json`

The lock is created with exclusive `open(wx)` semantics. It binds:

- exact typed-memory scope;
- random lease ID;
- owner PID and hostname;
- acquired, renewed, and expiry timestamps;
- renewal count;
- monotonic fencing token;
- SHA-256 checksum.

### Fencing

The next token is greater than all available proofs:

- transaction state's last token;
- last committed ledger token;
- abandoned lock token;
- a timestamp-derived monotonic floor.

This prevents token rollback even when a transaction-state file is corrupt or lost.

The committed token and lease ID are written into `.distillation-ledger.json`. The lock is renewed and reverified before Markdown/document commit and before final quality commit.

### Crash and corruption recovery

- A live local owner remains authoritative even if a long synchronous operation crosses the nominal TTL.
- A dead local owner or expired remote owner becomes an abandoned lease.
- A malformed lock receives a short corrupt grace period so a writer cannot quarantine another process while it is still writing the lock.
- Stale malformed locks are renamed to bounded `.abandoned.*` evidence files.
- At most 32 abandoned lock artifacts are retained per scope.
- A malformed transaction state is replaced by a valid higher-fence state on the next successful transaction.
- Failed ledger/document writes release the lock and persist a `failed` transaction state.
- Retry obtains a higher fence and reprocesses the still-uncommitted cursor range.

### Commit behavior

Every `distillGroupMessagesToTypedMemory()` call now runs inside the scoped transaction. `distillGroupMessagesToTypedMemoryUntilCaughtUp()` commits each bounded batch independently, allowing fair interleaving without losing the cursor or facts.

Direct remember/forget therefore shares the same serialization boundary as automatic long-term log distillation. A duplicate retry remains idempotent through the Phase 270 request receipt and tombstone ledger.

## Memory Center

The group memory context view now displays:

- transaction status;
- current and last committed fencing token;
- lock state and checksum validity;
- abandoned lease recovery count;
- most recent contention wait;
- last commit time and transaction error.

An active lock is shown as a warning/in-progress state. Invalid state, stale lock, failed checksum, or failed transaction is shown as a failure.

## Main Files

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-typed-memory-distillation-transaction-selftest.mjs`
- `package.json`

## Verification

Phase 271 fault-injection and multi-process test: 13/13 passed.

- two real Node processes serialize on one group-session scope;
- the second process records a real nonzero contention wait;
- fencing tokens increase across writers;
- facts from both writers remain present;
- successful writers release the lock;
- a force-killed owner becomes stale;
- crash recovery raises the fence;
- an uncommitted crashed fact never appears;
- the recovery writer commits normally;
- a durable write failure releases the lock and records failure;
- retry raises the fence and commits;
- the ledger binds the winning committed transaction;
- stale corrupt lock and corrupt transaction state recover without fence rollback.

Observed multi-process evidence:

- first fence: `1784009999174368`
- second fence: `1784010000216544`
- second writer wait: approximately `773 ms`
- abandoned crash fence: `1784010000433460`
- recovery fence: `1784010000461752`
- recovered leases: `1`

Regression results:

- direct remember/forget: 9/9 passed;
- incremental cursor: 13/13 passed;
- long-term write admission: 22/22 passed;
- positive feedback: 21/21 passed;
- positive feedback lifecycle: 19/19 passed;
- session-memory model extraction: 12/12 passed;
- typed-memory session recall: 20/20 passed;
- complete frontend, MCP integration, and backend build: passed.

Production HTTP smoke test:

- temporary session: `gcs_mrk9f2va_j82c2c`
- transaction state: `completed`
- state fence: `1784009876957984`
- last committed fence: `1784009876957984`
- ledger fence: `1784009876957984`
- lock present after commit: `false`
- SSE completion: verified
- temporary session and memory artifacts: deleted
- previous active session: restored

Production service:

- URL: `http://localhost:3081`
- PID: `32304`
- lifecycle heads: 13 checked, 13 valid, 0 failed
- stderr: empty

## Remaining Long-Term Work

The long-term Claude Code parity goal remains active. The next transaction-hardening candidate is to route the other typed-memory archive writers through a shared mutation coordinator so non-log archive updates cannot race with distillation in a multi-process deployment. Additional work remains on model-assisted forget candidate selection, memory extraction proposal admission, and broader real-provider long-run soak coverage.
