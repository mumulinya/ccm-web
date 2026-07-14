# Phase 221: Refresh outcome ledger and journal retention

Date: 2026-07-12

## Goal

Keep model-capability refresh telemetry useful and bounded over long-running CCM deployments. Refresh outcomes must survive concurrent maintenance, aggregate into provider health, and avoid unbounded JSONL growth.

## Compact outcome ledger

File:

`~/.cc-connect/memory-control/model-capability-refresh-outcomes.json`

Schema:

`ccm-model-capability-refresh-outcome-ledger-v1`

The ledger contains:

- Latest outcome per evidence id
- Retained outcome count
- Provider health rows
- Global refreshed, metadata-absent, unsupported, and degraded-provider totals
- Generation time, retention window, and stable checksum

Provider metrics include total attempts, refreshed, metadata absent, unsupported, refresh success rate, metadata availability rate, consecutive metadata-absent count, latest outcome/time/retry, and health.

Health values:

- `healthy`: at least one verified refresh and no active consecutive-missing degradation
- `monitor`: attempts exist but no verified refresh yet
- `degraded`: three or more consecutive metadata-absent outcomes
- `unsupported`: unsupported outcomes exist and no verified refresh
- `unknown`: no retained outcomes

## Concurrent outcome safety

Refresh outcomes now acquire the same cross-process refresh lease used by queue maintenance.

If the lease is available, the outcome is appended with lease id and fencing token. If the lease is busy, CCM atomically writes the outcome to:

`~/.cc-connect/memory-control/model-capability-refresh-outcome-pending/`

The next refresh lease holder drains valid pending rows into the journal and deletes only successfully merged files. Invalid pending schemas remain for diagnosis and increment the failure count.

This prevents journal rotation from racing an execution-completion callback and losing its refresh receipt.

## Journal retention

Production refresh journal is retained at a maximum of 5,000 rows. Before the maintenance completion row is appended, maintenance retains 4,999 rows so the final journal remains at or below the configured limit.

Older rows are written with exclusive creation into:

`~/.cc-connect/memory-control/model-capability-refresh-archive/`

Archive filenames include timestamp and content checksum. The active journal is then atomically replaced. Rotation, pending drain, queue generation, compact-ledger generation, status write, and completion journal all execute under one refresh lease.

## Status and Memory Center

Refresh status now includes:

- Pending outcomes drained/failed
- Journal rows before/retained/archived
- Archive file
- Compact provider health and totals
- Ledger checksum

The capability API returns the compact outcome ledger. Memory Center displays degraded-provider count, total outcomes, provider health, refresh success rate, and consecutive metadata-missing count.

## Verification

The Phase 221 regression proves:

1. Compact ledger aggregates refreshed and unsupported provider health.
2. An outcome arriving while the refresh lease is held enters pending spool.
3. The next lease holder drains that pending outcome.
4. A 45-row test journal rotates into an archive and remains within a 20-row configured bound.
5. Archive file exists and active journal is atomically retained.
6. All previous capacity, session identity, refresh outcome, downgrade, and lease tests remain green.

Required gates are TypeScript checks, backend/frontend builds, capacity regression, real process race, runtime ledger/API inspection, zero self-test residue, and `git diff --check`.

## Follow-up

The next phase should add outcome-ledger rebuild on startup when the compact ledger is missing or checksum-invalid, archive retention limits, and explicit acknowledgement for invalid pending outcome files.
