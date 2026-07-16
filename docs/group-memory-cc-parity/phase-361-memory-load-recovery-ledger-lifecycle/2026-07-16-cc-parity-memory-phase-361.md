# Phase 361: Memory-load recovery ledger lifecycle

Date: 2026-07-16

## Goal

Give the Phase 360 same-session memory-load recovery ledger a bounded, restart-safe lifecycle. Recovery evidence must not accumulate forever, disappear while still referenced, or be promoted to success after a crash without complete native-continuation proof.

## Recovery lifecycle inventory

`reconcileMemoryContextConsumptionRecoveries()` scans signed recovery records and retained task-agent memory snapshots. Each record is classified by:

- signed recovery status;
- exact challenge and snapshot reference;
- receipt presence and signature validity;
- recovered receipt-signature continuity;
- age and retention state;
- orphan and overflow state;
- interrupted-process state.

The report remains body-free. It exposes identifiers, states, checksums, counters, and issues, not memory text or Provider output.

## Default policy

| Setting | Default |
| --- | --- |
| Recovery-ledger retention | 30 days |
| Running recovery interruption threshold | 10 minutes |
| Orphan grace period | 1 hour |
| Maximum orphan recovery records | 2,000 |

Records still referenced by retained task-agent snapshots are never retention candidates, regardless of age.

## Crash reconciliation

At startup, a signed `prepared` or `running` record older than the interruption threshold is rewritten atomically as:

```text
status = interrupted
suppress_task_replay = true
issue = recovery_process_interrupted_before_commit
```

The rewritten record receives a fresh signature and audit timestamp. Its retention window starts from interruption reconciliation, preserving evidence long enough for diagnosis.

If the model receipt file exists but the recovery process crashed before committing native-continuation evidence, CCM reports:

```text
interrupted_receipt_present_without_continuation_commit
```

It does not infer `recovered` from receipt presence alone. This preserves the Phase 360 requirement that the same-native-session continuation itself must be proven.

## Retention safety

Only terminal, unreferenced records outside the grace period can be pruned. A record is eligible when:

- it exceeds the retention age; or
- it exceeds the bounded orphan count.

Fresh `prepared` and `running` records are never deleted. Newly reconciled `interrupted` records receive a new audit retention window instead of being deleted in the same startup pass.

Cleanup fails closed when any unreadable snapshot has no recoverable challenge id. Every deletion rechecks live snapshot references immediately before removing the file.

## Session and snapshot cleanup

Task-agent session purge and snapshot retention now remove both artifacts after the final reference disappears:

- model-load receipt;
- memory-load recovery ledger.

The removal helper checks the full retained snapshot fleet, so sibling `gcs_*` and `tas_*` records remain untouched.

## Startup integration

Server bootstrap now runs:

```text
reconcileMemoryContextConsumptionRecoveries({
  prune: true,
  reconcileInterrupted: true
})
```

Startup logging includes recovered, blocked, running, interrupted, orphan, pruned, invalid, and replay-suppressed counts.

## Memory Center

New recovery-lifecycle diagnostics include:

- referenced and orphan counts;
- interrupted count;
- receipt-present but uncommitted interruption count;
- stale and overflow orphan counts;
- prunable, pruned, and skipped counts;
- cleanup-blocked state and policy.

Memory Center exposes an audited maintenance operation:

```text
reconcile_memory_context_consumption_recoveries
```

Dry-run mode is read-only. Execution mode seals stale running states and prunes eligible terminal orphans.

Group-scoped reports include only that group's recovery rows. Fleet orphan identities do not leak into another group context, and no recovery diagnostics are injected into Agent prompts.

## Verification

The Phase 361 restart self-test uses an isolated temporary `HOME` and covers:

- a 40-day referenced recovered proof that must be preserved;
- stale recovered and overflow terminal orphans;
- fresh orphan grace preservation;
- referenced and orphan `running` crash states;
- signed transition to `interrupted`;
- a receipt-present interruption that must not be promoted;
- unreadable-snapshot fail-closed cleanup;
- fresh retention window after interruption sealing;
- exact sibling-group isolation;
- task-session purge linkage;
- restart idempotency;
- Memory Center and startup production wiring.

Results:

- Phase 361 recovery-ledger lifecycle/restart: `37/37`
- Phase 360 same-session receipt recovery/restart: `44/44`
- Phase 359 receipt lifecycle/restart: `40/40`
- Phase 358 model-side receipt/restart: `36/36`
- direct dispatch spool: `39/39`

## Remaining parity work

- Run real Provider omission/recovery soak matrices for Claude Code, Codex, and Cursor.
- Add crash injection around the actual Provider continuation process and filesystem commit boundary.
- Correlate recovered `loaded_unreported` outcomes with later item-level usage without upgrading correlation to semantic proof.
- Continue high-concurrency multi-group durability work.

The long-term Claude Code memory parity goal remains active.
