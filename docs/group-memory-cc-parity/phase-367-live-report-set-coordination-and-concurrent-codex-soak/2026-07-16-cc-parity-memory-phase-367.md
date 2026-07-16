# Phase 367: Live report-set coordination and concurrent Codex soak

Date: 2026-07-16

## Goal

Close the race between live Provider report production and retention execution, then exercise multiple independent CCM groups against an account-backed Codex Provider with concurrency greater than one.

The coordination boundary applies only to diagnostic reports. Memory receipts, recovery records, continuation ledgers, group memory, and session memory remain separate durable evidence stores and are never retention targets.

## Shared report-set lock

A new report store owns one cross-process lock for the complete live diagnostic report set. The following operations now participate in that lock:

- single Provider report commit;
- multi-group report child revalidation and commit;
- fleet source scan, current-evidence revalidation, and commit;
- retention execute inventory reconstruction and deletion.

The lock covers the whole fleet read-to-write reference window. Retention therefore cannot delete a source report after fleet reads it but before the fleet checksum reference becomes durable.

Multi-group commit re-reads each child report under the same lock and verifies:

- the file remains inside the managed single-report directory;
- schema and checksum are valid;
- the durable checksum matches the child output;
- `groupId` and `gcs_*` match the assigned group.

A missing, moved, changed, or mismatched child is reported as `child_report_not_durable_at_multi_commit` and cannot be counted as passed.

## Validated atomic commit

All three report kinds use the same commit implementation. It rejects:

- unknown schemas or versions;
- report-kind mismatches;
- invalid or changed checksums;
- invalid run ids;
- path-traversing or non-JSON file names.

The report body is written to an exclusive temporary file, flushed with `fsync`, and atomically renamed. Temporary files are removed on failure.

The shared lock records PID, hostname, token, and acquisition time. A new process can reclaim a lock left by a dead local owner; a live owner must release it or reach the bounded timeout.

## Memory Center

The retention inventory exposes a body-free coordination contract with:

- shared report-set lock enabled;
- retention execute using the shared lock;
- coordinated writer kinds: `single`, `multi`, and `fleet`;
- a checksum of the lock target rather than the local path.

Memory Center renders `coordinated` only when all three writer kinds and retention execute advertise the same contract. It does not treat a transiently present lock as an error.

## Cross-process verification

The Phase 367 harness verifies:

- retention waits while fleet owns the report-set lock;
- the fleet-to-multi-to-child edge becomes durable before retention rebuilds candidates;
- only two unreferenced old reports are removed;
- a writer waits behind another live owner and commits after release;
- a process crash leaves a durable lock and a new process reclaims it;
- restart rebuilds both reference levels;
- lower receipt, recovery, and continuation evidence remains untouched;
- checksum tampering and path traversal are rejected;
- no temporary report files remain;
- Memory Center exposes the coordinated state;
- audit rows remain body-free.

Result: `35/35`.

## Account-backed concurrent observation

An account-backed Codex run launched three independent groups with concurrency two and a 120-second per-Provider timeout.

Run id: `lpmg_mrn6xj51_1a7dc8c8c4`  
Report checksum: `7fcb4202f1e7f1981e91c340d3363890ff1e23b09980160cb9824f929a0bc6ae`

| Group | Result | Evidence |
| --- | --- | --- |
| group 1 | passed | exact native continuation, valid signed receipt, recovered ledger, one valid continuation chain |
| group 2 | failed observation | `provider_turn_timeout`; no receipt recovery was claimed |
| group 3 | failed observation | `provider_terminal_timeout`; receipt was valid but Provider terminal proof was absent, so recovery remained blocked and task replay was suppressed |

All three groups retained unique group ids, `gcs_*` ids, native sessions, sentinels, and challenges. `isolationValid` remained true. Neither timeout was converted into a false success or replayed as a full task.

## Fleet revalidation

The independent fleet audit re-read current signed continuation and recovery evidence after the concurrent run.

- source reports: `3`;
- observed groups: `6`;
- currently passing groups: `3`;
- isolated failed observations: `3`;
- stale or invalid previously passing groups: `0`;
- passing identity isolation: valid;
- minimum two-group gate: passed.

Fleet report checksum: `425e83a19ba4e788858187b32406f44effc22fdc0252c73a9b31f6d2b94271f8`

The post-fleet retention dry-run observed 18 reports, protected 6 child reports and 3 multi-group reports, and found zero prune candidates. No production report was deleted.

## Regression summary

- Phase 367 report-set coordination: `35/35`
- Phase 366 retention/restart: `56/56`
- live Provider deterministic matrix: `84/84`
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

Total targeted checks: `426/426`.

## Remaining parity work

- Run longer account-backed Codex fleets with a larger Provider timeout and repeated bounded waves.
- Add scheduled endurance summaries that distinguish Provider latency saturation from CCM failures.
- Obtain equivalent account-backed receipt-recovery evidence for Claude Code after its API retry condition clears.
- Obtain equivalent account-backed receipt-recovery evidence for Cursor after headless native sessions become responsive.
- Exercise Provider version changes while several exact-group recoveries are active.

The long-term Claude Code parity goal remains active. Managed report production and pruning now share a crash-recoverable transaction boundary, and real concurrency has been observed without cross-group contamination or false recovery success.
