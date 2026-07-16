# Phase 365: Account-backed multi-group receipt recovery

Date: 2026-07-16

## Goal

Extend the Phase 364 account-backed Codex memory receipt recovery from one synthetic operations group to multiple independent CCM groups. Every group must own a distinct `groupId`, `gcs_*`, `tas_*`, native session, random memory sentinel, signed challenge, receipt, recovery record, and continuation hash chain.

A failure in one group must remain visible without satisfying, invalidating, replaying, or contaminating another group.

## Explicit live identity

The live Provider probe now accepts explicit:

```text
--group-id
--group-session-id
```

Group ids are bounded and sanitized. Supplied session ids must match the `gcs_*` identity contract or the operation is rejected before launch. Existing single-group commands retain their previous defaults.

## Multi-group orchestrator

The new command is:

```text
npm run soak:task-agent-live-multi-group-codex-memory
```

It launches bounded Codex receipt-recovery children with configurable group count, concurrency, model, and timeout. The production default uses two groups and concurrency one to avoid account-side concurrency obscuring memory evidence.

Each child must independently prove:

- account-backed initial controlled omission;
- exact native session continuation;
- signed `acknowledge_memory_context` receipt;
- signed `recovered` recovery inventory row;
- one valid continuation chain;
- unchanged workspace;
- exact group and session identity.

The aggregate report stores checksums and statuses only. It verifies that group ids, `gcs_*` ids, sentinels, and challenges are unique across the run.

## Fleet audit

The read-only fleet command is:

```text
npm run audit:task-agent-live-multi-group-memory
```

It scans durable multi-group reports and independently re-reads current continuation ledgers and recovery inventories. Previously passing evidence becomes `stale_or_invalid` if its current signed artifacts no longer verify.

The gate requires:

- at least the configured number of currently passing groups;
- unique passing group, session, sentinel, and challenge identities;
- no stale or invalid previously passing proof.

Failed observations remain in the fleet report but do not contaminate passing groups.

## Deterministic verification

The deterministic harness runs three groups with concurrency two. Each child uses an independent fixture state file and production receipt/recovery stores.

It verifies:

- three unique group ids;
- three unique `gcs_*` ids;
- three unique sentinels and challenges;
- one receipt, recovery row, and valid chain per group;
- report and fleet checksums;
- body-free reports;
- fleet revalidation;
- Memory Center fleet counters;
- timeout fail-closed behavior.

Result: `84/84`.

## Account-backed observations

The first two-group account-backed run produced one passing group and one failed observation:

| Group | Result | Detail |
| --- | --- | --- |
| `phase365-live-group-...-1` | failed observation | native resume and contract valid, model completed 42 stream events but did not call MCP; signed recovery blocked with `receipt_missing` and replay suppression |
| `phase365-live-group-...-2` | passed | signed receipt and recovered inventory verified |

The failed group was not retried because the production policy permits one receipt-only attempt. A fresh replacement group was launched instead and passed independently.

First run id: `lpmg_mrn5mp43_bf5ef79a57`  
First report checksum: `fdf233be016256f99106d445e5a6016a46e7815f3f2ae79e9ba66cb110e151fb`

Replacement run id: `lpmg_mrn5satd_f2bb6abeeb`  
Replacement report checksum: `8ffbb2b584066ed640526983e9c4e32c002c8d3b84bb6b83c4f077e20efcf070`

The resulting account-backed fleet contains:

- observed groups: `3`;
- currently passing groups: `2`;
- retained failed observations: `1`;
- stale or invalid passing proofs: `0`;
- passing-group isolation: valid;
- minimum two-group gate: passed.

Fleet report checksum: `6c2b2acdafe183df907f9bbad12128231c5fb5ea1e232a3812deff370c5cef5d`

The two passing groups have distinct group ids, `gcs_*` ids, native session checksums, sentinel checksums, challenge checksums, recovery ids, receipts, and continuation ledgers.

## Memory Center

Memory Center reads only checksum-valid fleet reports and exposes:

- observed and passing group counts;
- retained failed observations;
- stale or invalid proofs;
- passing-group isolation and fleet gate state;
- compact per-group diagnostic identities and checksums.

The fleet report is diagnostic-only. It is not injected into group main Agent, project child Agent, or Global Agent prompts.

## Verification summary

- Phase 365 deterministic multi-group/fleet harness: `84/84`
- Phase 364 deterministic stream and receipt recovery: included in the same harness
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

## Remaining parity work

- Run longer account-backed multi-group fleets and concurrency greater than one after establishing a quota budget.
- Add scheduled aging and retention policy for live fleet reports without deleting referenced recovery evidence.
- Obtain equivalent account-backed receipt recovery for Claude Code after its API retry condition clears.
- Obtain equivalent account-backed receipt recovery for Cursor after headless session startup becomes responsive.
- Exercise Provider version changes while multiple group recoveries are active.

The long-term Claude Code parity goal remains active. Multi-group support is now proven with two independent account-backed passing groups and one correctly isolated failed observation.
