# Phase 279: Durable Typed-Memory Artifact Retry

## Status

Completed on 2026-07-14.

Phase 278 made model-confirmed typed-memory commits fail independently from the already committed Session Memory snapshot. Phase 279 turns that `failed_retriable` state into a durable recovery workflow that survives process restart and never reruns the model.

## Invariants

- Scope remains exactly `groupId--gcs_*`.
- A retry cannot read or write another group session.
- The committed Session Memory snapshot is never rolled back or replaced by typed-memory retry.
- Retry uses signed request/result artifacts and their embedded committed receipt.
- Retry does not call the model executor.
- A later extraction may replace the current receipt file without making an older failed commit unrecoverable.
- Legacy `default` sessions remain rejected and are not migrated.

## Durable Retry Ledger

Each session can persist:

`group-session-memory/<groupId--gcs_*>/typed-memory-commit-retry.json`

The ledger contains checksummed entries with:

- extraction execution ID;
- pending, completed or exhausted status;
- attempt count and maximum attempts;
- receipt, request artifact, result artifact and fact-graph checksums;
- next retry time and latest error;
- recovered archive checksum and admission counts.

The ledger and every entry have independent checksums. Scope mismatch, malformed entries or checksum changes fail closed.

## Retry Execution

Automatic retry performs the following steps:

1. Read the pending retry entry.
2. Resolve the original request and result artifacts from hot storage or the retention archive.
3. Verify artifact checksums, scope, execution identity and committed result status.
4. Read the embedded committed receipt and validated markdown.
5. Re-run the Phase 278 deterministic admission and shared typed-memory mutation.
6. Mark the retry completed and append a hash-chained `typed_memory_commit_recovered` history event.

The model is not invoked. Retry returns `modelInvoked: false` as explicit evidence.

## Receipt Rollover

Normal commits still accept the current `model-extraction-receipt.json` as proof. Artifact-only retry can instead use the checksummed committed result artifact. This allows an older failed execution to recover after a newer extraction has replaced the current receipt and Session Memory snapshot.

## Scheduling And Restart

- Initial delay defaults to 30 seconds.
- Repeated failures use bounded exponential backoff.
- Default maximum attempts: 12.
- Module startup scans all exact `groupId--gcs_*` retry ledgers.
- Pending entries are rescheduled without requiring model executor configuration.
- Exhausted entries remain auditable and require an explicit manual retry.
- Deleting the group session removes the retry ledger with the rest of the session-memory directory; scheduled callbacks stop when the entry no longer exists.

## Memory Center

The Session Memory fleet now reports:

- pending retry count;
- recovered retry count;
- exhausted retry count;
- invalid retry-ledger count.

Pending retries make the session health `warn`. Exhausted or invalid retry state makes it `fail`.

For pending or exhausted entries, Memory Center shows `立即重试`. The operation requires explicit confirmation and replays signed artifacts only. It never invokes the model and records a memory-operation audit event.

## Verification

New focused test:

`npm run test:group-session-model-extraction-typed-memory-retry`

Result: 11/11 checks passed.

Covered behavior:

- failed post-snapshot commit persists a valid retry ledger;
- a later extraction replaces the current receipt;
- the old execution recovers from artifacts only;
- retry does not invoke the model or mutate the latest snapshot;
- recovered memory becomes recallable only in its source session;
- completed retry is idempotent;
- startup scan recovers pending work without the model;
- recovery history remains hash-chain valid;
- Memory Center exposes recovery state;
- retry-ledger tampering fails closed;
- no legacy `default` session is created.

Regression tests passed:

- Phase 278 model extraction to typed-memory closure;
- forked model Session Memory extraction;
- fact supersession;
- typed-memory artifact transaction recovery;
- shared ledger mutation coordination;
- Memory Center session scope.

Full `npm run build` passed for frontend, MCP Feishu and backend.

Runtime deployment verification:

- URL: `http://localhost:3081`
- HTTP status: `200`
- server PID after restart: `31352`
- Memory Center overview exposes retry pending, recovered and invalid counters
- lifecycle heads: 2 valid, 0 failed
- `fetch-web-mcp`, `filesystem-mcp` and `mcp-feishu`: connected
- stderr: empty

## Main Files

- `backend/modules/collaboration/group-session-memory-model-extraction.ts`
- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/group-session-model-extraction-typed-memory-retry-selftest.mjs`
- `package.json`

## Next Direction

The next parity step should compare Claude Code's memory extraction topic lifecycle with CCM's topic granularity. CCM currently writes two fixed model-extracted topic files per session. The next phase should evaluate semantic topic splitting and bounded topic consolidation without letting the model directly control filenames or paths.
