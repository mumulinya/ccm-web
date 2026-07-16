# Phase 369: Endurance scheduler and Provider version advisory

Date: 2026-07-16

## Goal

Convert the Phase 368 endurance audit into a bounded scheduled maintenance path, track reliability across Provider version epochs, and produce explicit concurrency/timeout advice without starting paid Provider work or mutating user policy.

## Scheduled audit

The existing CCM Cron scheduler now invokes a memory-endurance scheduler tick. This is a maintenance audit, not a user cron job and not an Agent task.

Default behavior:

- audit interval: six hours;
- first due tick with source evidence: persist one signed endurance report;
- unchanged source/evidence fingerprint: record `source_unchanged` without another report;
- no source waves: record `no_source_evidence` without an empty report;
- before next due time: return `not_due` without scanning or writing;
- changed source or child evidence: persist a new signed report.

The source fingerprint includes source multi checksums plus child checksum, validity, classification, Provider version, and executable identity. A deleted, invalid, reclassified, or version-changed child therefore changes the scheduler input even if the source multi file remains unchanged.

Scheduler state records only timestamps, counters, checksums, gate state, and recommendations. It explicitly persists:

```text
destructiveActionAuthorized = false
liveExecutionAuthorized = false
policyMutationApplied = false
createdTaskCount = 0
deletedCount = 0
```

The scheduler does not create an entry in `cron-jobs.json` and does not launch Claude Code, Codex, Cursor, a group main Agent, or a project child Agent.

## Provider version trend

Each wave now captures controlled Provider evidence from its signed child reports:

- Provider version;
- Provider runtime identity checksum;
- model diagnostic code;
- wave source checksum and generated time.

Adjacent waves with the same Provider, model, version set, and executable identity belong to one version epoch. A changed version key creates a transition with old/new checksums and observed time.

Per epoch, the report aggregates wave count, group count, passes, Provider latency timeouts, receipt failures, and CCM evidence failures. This permits later comparison across upgrades without mixing groups from different Provider binaries.

## Advisory policy

The report provides recommendations but cannot apply them.

When elevated-concurrency latency correlation is present, the recommended concurrency ceiling is one. Otherwise it remains at the highest observed concurrency. The timeout recommendation is 1.25 times observed group-duration p95, rounded to five seconds and bounded from 60 to 300 seconds.

Every report stores:

```text
advisoryOnly = true
policyMutationApplied = false
nextWave.liveExecutionAuthorized = false
```

The next-wave row is a reviewable plan, not an execution request.

## Memory Center

Memory Center now exposes:

- Provider version epoch and transition counts;
- recommended concurrency ceiling;
- recommended Provider timeout;
- advisory-only state;
- endurance scheduler presence and safety.

The compact live endurance card shows version trend and the current recommendation alongside wave, timeout, and CCM evidence counts.

## Real scheduler observation

The first production-home forced tick persisted one updated endurance report:

- status: `persisted`;
- run count: `1`;
- persisted count: `1`;
- recommended concurrency ceiling: `1`;
- recommended Provider timeout: `180000 ms`;
- live execution authorized: false;
- policy mutation applied: false;
- tasks created: `0`;
- reports deleted: `0`.

Report checksum: `dc26a1cf60a75e27b5b9397826dbf392f85d929f70802650c7be1409d257a079`

An immediate second forced tick returned `source_unchanged`, increased `noChangeCount` to one, and did not persist another report.

Current real evidence contains one Codex version epoch (`0.115.0`) and zero real version transitions. The three-version/two-transition behavior is proven by the deterministic harness; a real transition will only be recorded after an installed Provider identity actually changes.

## Cron and shutdown integration

Cron run-history contract checks pass after the maintenance tick integration. The Cron API reliability scenario also passes misfire handling, startup recovery, automatic retry, manual retry, and cancellation.

That API test exposed an existing shutdown lifecycle gap after the workspace moved task storage to SQLite. `server.close()` stopped schedulers but did not close the SQLite task store, leaving `ccm.db` busy on Windows. The shared server close hook now checkpoints and closes the task store. The test reads current task state through authoritative `loadTasks()` rather than assuming legacy `tasks.json` still exists.

## Deterministic verification

The Phase 369 harness creates three signed Provider version epochs and two transitions. It verifies:

- first due tick persistence;
- unchanged-source deduplication;
- `not_due` behavior;
- empty-scope no-report behavior;
- new-version source persistence;
- three version epochs and two transitions;
- recommended concurrency one and timeout 180 seconds;
- advisory-only, no policy mutation, no live execution;
- no task or user cron creation;
- durable scheduler restart state;
- Memory Center version/advisory fields;
- endurance-to-multi-to-child retention protection.

Result: `51/51`.

## Real retention dry-run

After the scheduled report was persisted:

- reports: `22`;
- valid reports: `19`;
- fail-closed old-format or invalid reports: `3`;
- endurance reports: `4`;
- referenced multi reports: `3`;
- referenced child reports: `6`;
- prune candidates: `0`.

No production report or memory evidence was deleted.

## Regression summary

- Phase 369 scheduler/version advisory: `51/51`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 retention/restart: `56/56`
- live Provider deterministic matrix: `84/84`
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`
- Cron run-history contract: passed
- Cron API reliability: passed

Total targeted memory checks: `522/522`.

## Remaining parity work

- Accumulate additional bounded account-backed waves before increasing attribution confidence.
- Record and compare the first real Codex version transition after the installed CLI changes.
- Add approval-driven execution for a recommended wave without allowing scheduler-side implicit spending.
- Obtain equivalent account-backed receipt recovery for Claude Code and Cursor when their native environments are responsive.
- Compare version transitions while multiple exact-group recoveries are active.

The long-term Claude Code parity goal remains active. Endurance evidence is now scheduled, deduplicated, version-aware, restart-safe, and advisory-only.
