# Phase 302: Auto-Compact Circuit Breaker Restart Safety

## Status

- Date: 2026-07-15
- Result: completed
- Scope: exact-session automatic-compaction failure circuit breaker, restart persistence, manual recovery, fail-closed corruption handling, Memory Center visibility
- Long-term goal: remains active

## Claude Code parity source

Claude Code carries `consecutiveFailures` in `AutoCompactTrackingState` and stops automatic compact after three consecutive failures:

- `D:\claude-code\src\services\compact\autoCompact.ts:49-69`
- `D:\claude-code\src\services\compact\autoCompact.ts:267-363`

The breaker prevents irrecoverably over-limit sessions from retrying a doomed compact request on every turn. A successful compact resets the streak. Manual compact remains a separate recovery path.

## Gap

CCM persisted a `compaction.consecutiveFailures` field, but the automatic scheduling and execution entry points never read it. After three hard failures, every appended group message could still schedule another attempt.

The same field was also used by model-summary fallback retry logic, mixing two different states:

- model-assisted summary failed but deterministic compact succeeded
- the complete automatic compact transaction failed

The value happened to live in session memory, but it was not an actual circuit breaker and did not provide checksummed restart evidence.

## Implementation

### Exact-session durable ledger

`group-memory-auto-compact-circuit-breaker.ts` adds a body-free, checksummed ledger per `groupId + gcs_*`:

- state: `closed`, `open`, or runtime `fail_closed`
- consecutive failures capped at 3
- revision, open time, last failure, and last success
- bounded outcome events
- error class and error fingerprint only; no raw exception or transcript body
- idempotent attempt identity

The ledger uses atomic writes and file locking. Another group chat session has a separate file and failure streak.

### Two admission gates

Both automatic entry points check the ledger:

- `scheduleGroupMemoryAutoCompaction()` refuses to create a timer when open
- `runGroupMemoryAutoCompactionNow()` checks again before execution

The second gate closes restart and race windows where a timer was created before the third failure committed.

Only hard transaction failures increment this ledger. Model-summary failure followed by a successful deterministic compact remains governed by the existing model retry state and is not treated as a failed automatic compact transaction.

### Recovery

A successful primary compact resets the failure streak to zero. `force=true` manual compact bypasses an open or fail-closed automatic breaker; only a real durable primary boundary closes it.

A skipped compact or partial sidecar does not falsely claim recovery.

If the primary ledger is missing, corrupt, or checksum-invalid, a valid `.bak` is retained as diagnostic evidence but automatic execution remains `fail_closed`. This prevents a stale backup containing only two failures from admitting a fourth doomed request. A real successful manual compact can replace the invalid state.

### Memory Center and deletion

The exact group-session detail exposes:

- breaker state and blocked status
- failure count and threshold
- revision and checksum health
- open, failure, and success timestamps
- bounded body-free events

Deleting a group chat session removes its circuit-breaker ledger without touching sibling sessions.

## Verification

Phase 302 uses two real Node processes and an isolated home directory. Dedicated selftest: 12/12.

- three failures open the circuit
- the fourth run and schedule are blocked
- the failure ledger is checksummed and body-free
- sibling group session remains independent
- process restart preserves the open circuit
- manual compact bypasses and resets it
- Memory Center exposes the exact session state
- backup recovery remains blocked
- corrupt primary and backup fail closed
- explicit successful recovery restores admission
- restart ledger remains body-free
- session deletion removes circuit artifacts

Regression evidence:

- Exact-session automatic compaction scope: 12/12
- Phase 301 cleanup source scope: 13/13
- Phase 300 generation restart reconciliation: 14/14
- Phase 295 compact restart soak: 11/11
- Group-session sidecar isolation: 14/14
- Task-Agent compact-head fence: 38 checks
- Global Agent global-only context: 13/13
- `npm run build:backend`: passed
- `npm run build`: passed

## Production Evidence

- URL: `http://localhost:3081`
- Production PID: `20592`
- Home responses: three consecutive HTTP 200
- Memory Center overview: HTTP 200, 187824-byte response
- stderr size: 0 bytes
- Log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase302.log`
- Error log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase302.err.log`

Visual verification used a temporary exact-session open-circuit fixture:

- desktop viewport: 1280 x 720
- mobile viewport: 390 x 844
- six circuit cards, no overlap
- desktop panel: 634 px client width and 634 px scroll width
- mobile panel: 306 px client width and 306 px scroll width
- browser console warnings/errors: 0
- temporary fixture and 10 generated memory artifacts removed after QA

## Remaining Parity Work

Phase 302 closes repeated automatic compact attempts after persistent transaction failure. The long-term parity goal remains active; the next source audit should compare Claude Code's reactive compact and prompt-too-long retry ownership with CCM's PTL emergency and task-Agent retry paths.
