# Phase 366: Live Provider memory report retention

Date: 2026-07-16

## Goal

Bound the diagnostic reports produced by the account-backed Provider memory soaks without deleting evidence that is still referenced by a retained fleet report.

This maintenance layer applies only to live soak reports. It never deletes memory-consumption receipts, receipt-recovery records, continuation ledgers, group memory, or session memory.

## Reference-aware inventory

The retention inventory verifies report schemas and signed checksums, then reconstructs this reference graph:

```text
retained fleet report
  -> multi-group source report checksum
    -> single-group child report checksum
```

A retained fleet report protects its referenced multi-group reports. Those retained multi-group reports protect their referenced child reports, even when the protected reports are older than their ordinary retention windows.

Invalid JSON, unknown schemas, and checksum-invalid reports fail closed. They remain on disk for investigation and are never automatic prune candidates.

## Default policy

| Report class | Retention | Maximum | Minimum retained |
| --- | ---: | ---: | ---: |
| single Provider report | 30 days | 500 | 20 |
| multi-group report | 30 days | 200 | 10 |
| fleet report | 90 days | 100 | 5 |

All report classes also receive a one-hour grace period. A valid report is eligible only when it is unreferenced, outside the grace period, beyond the minimum retained count, and either expired or beyond the maximum count.

## Maintenance commands

Read-only inventory and candidate audit:

```text
npm run maintenance:live-provider-memory-reports
```

Explicit prune after reviewing the dry-run:

```text
npm run maintenance:live-provider-memory-reports:execute
```

Execution re-reads every candidate and verifies its path, kind, and checksum immediately before deletion. Changed, missing, invalid, or out-of-root candidates are skipped. Every dry-run and execution appends a body-free audit record containing counts and checksums rather than memory text or sentinels.

## Memory Center

Memory Center now exposes:

- total, valid, and invalid diagnostic report counts;
- referenced child and multi-group report counts;
- currently prunable and overflow counts;
- a compact live report retention card alongside the Provider and multi-group fleet diagnostics.

The inventory is diagnostic-only and is not injected into Global Agent, group main Agent, or project child Agent context.

## Deterministic verification

The Phase 366 restart harness creates fresh, expired, overflow, referenced, malformed, and unmanaged fixtures. It verifies:

- dry-run does not delete candidates;
- fleet-to-multi-to-child references survive aging and overflow;
- malformed reports fail closed;
- execute removes only four verified unreferenced candidates;
- lower-level receipt, recovery, and continuation evidence remains untouched;
- restart reconstructs the same reference graph;
- repeated execution is idempotent;
- Memory Center counters match the durable inventory;
- audit rows remain body-free.

Result: `56/56`.

## Real inventory dry-run

The production-home dry-run on 2026-07-16 observed:

- reports: `13`;
- checksum-valid current-schema reports: `10`;
- old-format or invalid reports retained fail-closed: `3`;
- referenced single reports: `3`;
- referenced multi-group reports: `2`;
- prune candidates: `0`.

No production report was deleted.

## Regression summary

- Phase 366 retention/restart: `56/56`
- live Provider deterministic matrix: `84/84`
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

Total targeted checks: `391/391`.

## Remaining parity work

- Run longer account-backed multi-group endurance fleets with bounded concurrency and restart injection.
- Obtain account-backed receipt-recovery evidence for Claude Code after its API retry condition clears.
- Obtain account-backed receipt-recovery evidence for Cursor after headless native sessions become responsive.
- Exercise Provider version transitions while several exact-group recoveries are active.
- Add stronger coordination between report production and maintenance for highly concurrent scheduled pruning.

The long-term Claude Code parity goal remains active. Core session memory, exact-group injection, signed consumption, same-native-session recovery, multi-group isolation, and bounded diagnostic retention are implemented; the remaining work is primarily endurance and additional real-Provider proof.
