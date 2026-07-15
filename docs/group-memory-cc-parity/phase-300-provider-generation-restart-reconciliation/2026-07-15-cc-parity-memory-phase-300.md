# Phase 300: Provider Generation Restart Reconciliation

## Status

- Date: 2026-07-15
- Result: completed
- Scope: crash-consistent compact boundary commit, Provider generation reset reconciliation, restart recovery, fail-closed fencing, Memory Center visibility
- Long-term goal: remains active

## Problem

Phase 299 made Provider compact capacity generation-scoped, but the normal compact path still had a crash window:

1. compact memory
2. reset Provider capacity generation
3. persist the boundary journal and memory
4. commit the compact head

If the process exited after step 2, the capacity ledger could move to the next generation before the durable compact boundary existed. If it exited after the durable boundary but before reset, the transcript head and Provider generation could disagree after restart.

The required invariant is now:

> A Provider capacity generation may advance only from a verified durable compact boundary, and restart must deterministically reconcile the exact group-session ledger to that boundary.

## Implementation

### Commit order

`runGroupMemoryAutoCompactionNow()` now performs the primary compact transaction in this order:

1. persist compacted memory and the checksummed boundary journal
2. commit the verified compact head
3. reset the exact Provider-session capacity generation

The reset intent contains identifiers and checksums only. It does not copy transcript or memory bodies into the capacity ledger.

If the reset write fails after the compact head is durable, compact remains committed and reports `pending_reconciliation`. It is not misreported as a failed compact and it cannot apply Provider-native capacity using an unverified generation.

### Boundary-bound reset

`provider-native-compact-session-capacity.ts` binds every reset to:

- exact `groupId + gcs_* + tas_* + nativeSessionId`
- boundary id and boundary receipt checksum
- compact-head id, generation, and checksum
- prior and resulting capacity generation

Repeating the same boundary reset is idempotent. An older compact-head generation cannot be replayed, and two different boundaries cannot reset the same compact-head generation.

### Restart reconciliation

`reconcileProviderNativeCompactSessionCapacityReset()` compares the recovered compact head with the capacity ledger and returns one of these body-free states:

- `recovered`: a verified durable head advanced the ledger after restart
- `current`: the matching reset was already applied; no generation churn
- `fail_closed`: the durable proof is missing, stale, conflicting, or invalid
- `failed`: persistence or validation failed

`prepareGroupMemoryResumeProjection()` runs this reconciliation after compact-head recovery. A journal-only crash can first recover the head and then advance capacity. A head-committed crash can advance capacity directly. Repeated resume is idempotent.

Provider-native apply is stopped for the current projection when reconciliation is not `current`, `recovered`, or `not_applicable`. A tampered head therefore cannot advance generation or consume stale capacity credit.

### Child-Agent context and audit

The child-Agent bundle carries both structured reconciliation and the current generation fence. The short rendered context places these lines before lower-priority memory detail so the 6000-character projection limit cannot remove the safety state.

Resume proof records boundary id, compact-head identity, generation, reset id, status, and bounded issues. Raw transcript text and typed memory bodies remain outside the proof and capacity ledgers.

### Memory Center

Opening an exact group-session detail now recovers and validates the compact head before summarizing Provider capacity. The Provider panel exposes reconciliation status alongside generation, reset, capacity, sticky-beta, and rejected-outcome evidence. `failed` and `fail_closed` states are rendered as failures.

## Verification

Phase 300 uses two real Node processes with an isolated home directory. Its 14/14 selftest proves:

- journal committed while compact head and reset are absent
- compact head committed while reset is absent
- generation-1 capacity credit survives the simulated process exit
- restart recovers the compact head and advances generation 2
- pre-crash capacity and sticky beta are cleared
- repeated resume does not advance generation again
- a tampered head fails closed
- a delayed generation-1 Provider outcome is fenced
- child-Agent structured and rendered context use generation 2
- Memory Center and resume proof expose reconciliation
- an untouched session remains at generation 1
- raw transcripts and ledgers remain body-safe

Regression evidence:

- Phase 300 restart reconciliation: 14/14
- Phase 299 generation reset: 12/12
- Phase 298 Provider capacity: 14/14
- Phase 296/297 Provider receipt and outcome: 21/21
- Phase 295 compact restart soak: 11/11
- Phase 294 durable snip replay: 11/11
- Phase 293 resume integration: 12/12
- Group-session sidecar isolation: 14/14
- Global Agent global-only context: 13/13
- `npm run build:backend`: passed
- `npm run build`: passed

## Production Evidence

- URL: `http://localhost:3081`
- Production PID: `30664`
- Home responses: three consecutive HTTP 200
- Memory Center overview: HTTP 200, 187824-byte response
- stderr size: 0 bytes
- Log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase300.log`
- Error log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase300.err.log`

## Remaining Parity Work

Phase 300 closes the known crash window between compact-boundary durability and Provider capacity-generation reset. The long-term parity goal remains active: each completed phase is followed by a fresh source-level Claude Code audit rather than treating the current implementation as permanently complete.
