# Phase 371: Live memory wave approval retention

Date: 2026-07-16

## Goal

Bound the long-term growth of live Provider wave approval receipts without deleting active authority, in-flight execution evidence, tampered diagnostics, or reports that a retained receipt still references.

This phase closes the terminal approval retention item left by Phase 370. It does not grant approval or execute a Provider wave.

## Receipt lifecycle

The inventory now durably reconciles two non-terminal edge states:

- an `approved` receipt past `expiresAt` is HMAC-resealed as `expired` and consumed;
- a `claimed` receipt past the interruption threshold is HMAC-resealed as `interrupted`.

Terminal statuses are:

```text
completed
completed_with_failures
execution_failed
interrupted
revoked
expired
```

`approved` and `claimed` receipts are never prune candidates. Invalid, malformed, checksum-mismatched, or HMAC-mismatched receipts fail closed and remain on disk for diagnosis.

## Default policy

```text
terminal retention: 30 days
minimum retained terminal receipts: 20
maximum retained terminal receipts: 500
fresh terminal grace: 1 hour
claimed interruption threshold: 10 minutes
```

A terminal receipt is a candidate only after the grace period and minimum retained floor. It may qualify because its retention age expired, because it exceeds the bounded count, or both.

Reading Memory Center, building report inventory, or running background endurance scheduling never prunes a receipt. Deletion requires an explicit maintenance execution.

## Fail-closed deletion

The maintenance path supports dry-run and execute modes. Immediately before unlinking each candidate, it re-reads the primary receipt and verifies:

- the path remains inside the managed approval directory;
- the receipt checksum is unchanged from the inventory candidate;
- the current core hashes to that checksum;
- the private HMAC signature remains valid;
- the current status is still terminal.

Any drift is skipped and retained. Successful pruning removes the terminal primary and its atomic backup only. The private HMAC secret and all lower-level memory receipt, recovery, and continuation evidence directories are outside this cleanup boundary.

## Reference graph

Retained approval receipts now participate in live report retention:

```text
approval receipt -> endurance report -> source multi reports -> child single reports
completed execution receipt -> execution multi report -> child single reports
```

An endurance report protected by a retained approval is marked `approval_receipt`. An execution multi report protected by a retained completion receipt is marked `approval_execution_receipt`.

These references override age and report-count pressure. A report can return to ordinary retention eligibility only after no retained approval receipt references it.

## Audit and controls

Each explicit dry-run or execute writes a body-free JSONL audit record containing only policy outcome counts and checksums of candidate/pruned identities. Approval reason text, revocation reason text, memory content, prompts, and Provider output are not copied into this ledger.

CLI controls are:

```text
npm run maintenance:live-memory-wave-approvals
npm run maintenance:live-memory-wave-approvals:execute
```

The first command is a dry-run. The second is the only CLI command that deletes verified terminal approval receipts.

Memory Center now shows approved, completed, failed, expired, terminal, invalid, and prunable counts. It offers a separate `审批清理预演` action and an explicitly confirmed `清理审批回执` action. The destructive API requires `explicitPrune=true`.

## Deterministic verification

The Phase 371 harness uses an isolated temporary HOME and a controlled local Codex version probe. It does not call a model or access a real account.

It verifies:

- seven historical revoked receipts and bounded-count aging;
- durable `approved` to `expired` sealing;
- current `approved` and `claimed` protection;
- successful execution receipt retention;
- exact endurance and execution multi-report references;
- tampered receipt fail-closed retention;
- dry-run no deletion;
- explicit prune and atomic backup cleanup;
- second-read checksum/HMAC/status boundaries;
- Memory Center explicit destructive confirmation;
- private HMAC secret preservation;
- lower-level memory evidence preservation;
- restart reference-graph reconstruction;
- idempotent repeated cleanup;
- Memory Center counters;
- body-free retention audits.

Result: `65/65`.

## Regression summary

- Phase 371 approval retention/restart: `65/65`
- Phase 370 approved wave lifecycle: `55/55`
- Phase 369 scheduler/version advisory: `51/51`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 report retention/restart: `56/56`

Phase 366-371 related checks in this run: `307/307`.

Targeted memory checks through Phase 371: `642/642`.

Full frontend, MCP, and backend builds pass. TypeScript checks pass, and documentation links pass `1051/1051`.

## Production safety

No production approval was created, claimed, executed, revoked, or deleted during this phase. No account-backed Provider call was made. The implementation and tests used isolated deterministic data only.

## Remaining parity work

The core CCM memory system is operational: exact group-session memory isolation, Global Agent global-only context, task Agent context injection and consumption proof, compaction/reinjection, typed memory, recovery, retention, and Memory Center controls are implemented and covered.

Remaining long-term work is hardening and field evidence:

- execute an account-backed recommended wave only after a real user submits a valid approval receipt;
- persist a cross-version comparison after the installed Provider identity actually changes;
- obtain equivalent account-backed recovery evidence for Claude Code and Cursor when their native environments are responsive;
- prove simultaneous exact-group recovery across a real Provider transition;
- continue comparing future Claude Code memory behavior and migrate only verified improvements.

The long-term Claude Code parity goal remains active. These remaining items are production evidence and ongoing parity work, not blockers for normal multi-group CCM memory use.
