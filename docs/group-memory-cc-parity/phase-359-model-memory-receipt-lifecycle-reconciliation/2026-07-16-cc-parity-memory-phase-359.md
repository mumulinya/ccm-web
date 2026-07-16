# Phase 359: Model memory receipt lifecycle reconciliation

Date: 2026-07-16

## Goal

Make the Phase 358 model-side memory load receipt safe for long-running CCM installations. Signed receipt files must have bounded retention, restart reconciliation, exact group/session isolation, conservative cleanup, and Memory Center visibility.

This phase does not change the semantic distinction established by Phase 358:

- a valid model MCP receipt proves `loaded`;
- it does not prove that an individual memory item was semantically used;
- `used`, `ignored`, and `verified` still require their existing structured evidence.

## Lifecycle inventory

`reconcileMemoryContextConsumptionReceipts()` scans the central receipt directory and retained task-agent memory snapshots. It classifies every challenge reference as:

- `referenced_valid`;
- `referenced_missing`;
- `referenced_invalid`;
- `orphan_fresh`;
- `orphan_stale`;
- `orphan_overflow`.

Referenced receipts are reverified against the original signed challenge and exact:

- group;
- `gcs_*` group session;
- task and execution;
- project;
- `tas_*` task-agent session.

The inventory is metadata-only. It does not return trusted-memory bodies or Provider output.

## Bounded retention

Default orphan policy:

| Setting | Default |
| --- | --- |
| Orphan retention | 7 days |
| In-flight grace period | 1 hour |
| Maximum retained orphans | 2,000 |

An orphan becomes prunable when it is older than the retention window or exceeds the bounded orphan count, and it has also passed the in-flight grace period.

Referenced receipts are never retention candidates, even when their signature is invalid. Invalid referenced evidence remains available for diagnosis instead of being silently erased.

## Fail-closed cleanup

Cleanup rechecks live snapshot references immediately before deletion. It refuses deletion when:

- any retained snapshot still references the challenge;
- a snapshot is unreadable and contains the challenge id;
- an unreadable snapshot contains no recoverable challenge id, making the orphan set uncertain;
- the target path is outside the dedicated receipt directory;
- the receipt is still inside the execution grace period.

This makes an unreadable snapshot a cleanup safety event rather than permission to treat all unknown receipts as garbage.

## Snapshot linkage

Task-agent session and snapshot cleanup now carries receipt ownership with it:

- purging a task-agent session collects its challenge ids before deleting the snapshot directory;
- snapshot retention collects the challenge id before deleting each old snapshot;
- after snapshot/session state is committed, CCM removes a receipt only when no retained snapshot still references it;
- sibling `gcs_*` and `tas_*` receipts remain untouched.

## Startup recovery

Server bootstrap runs fleet receipt reconciliation with pruning enabled after task-agent invocation and continuation recovery. Startup logs report:

- valid references;
- missing receipts;
- invalid/tampered receipts;
- orphan count;
- pruned and skipped counts.

Only stale or overflow orphans outside the grace period are removed. Missing or invalid referenced receipts remain visible and affect health.

## Memory Center

The task-agent memory report now exposes:

- valid, missing, and invalid model-load receipt counts;
- orphan and prunable counts;
- cleanup-blocked state;
- scoped reference diagnostics;
- fleet orphan retention diagnostics;
- an audited `reconcile_memory_context_consumption_receipts` maintenance operation.

Missing or invalid referenced receipts set task-agent memory health to `fail`. Prunable/invalid orphans or a fail-closed cleanup block set it to `warn`.

Group reports only return references belonging to that exact group filter. Fleet orphan identities are not exposed inside group-scoped reports, preserving multi-group isolation.

The Memory Center UI adds model-loaded, receipt-gap, and receipt-retention cards plus a bounded anomaly list.

## Verification

The Phase 359 restart self-test uses an isolated temporary `HOME` and covers:

- valid, missing, and tampered referenced receipts;
- fresh, stale, and overflow orphans;
- orphan grace-period preservation;
- fail-closed behavior for unreadable snapshots;
- live-reference recheck before deletion;
- exact group filtering and sibling-group preservation;
- restart reconstruction;
- final-reference removal;
- task-agent session purge linkage;
- Memory Center counters and production startup wiring.

Results:

- Phase 359 receipt lifecycle/restart: `40/40`
- Phase 358 model-side load receipt: `36/36`
- Phase 357 Provider acknowledgement: `38/38`
- full frontend, MCP, and backend build: pass

## Remaining parity work

The core memory path is operational and strongly evidenced. Remaining Claude Code parity work is narrower hardening:

- calibrate retry behavior when useful Provider work completed but the required model-load call was omitted;
- correlate `loaded_unreported` with later item-level usage and task outcomes without promoting correlation to proof;
- run longer high-concurrency and crash-injection soak tests across multiple groups and Providers;
- continue comparing new Claude Code memory behavior as the reference implementation evolves.

The long-term Claude Code memory parity goal remains active.
