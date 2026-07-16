# Phase 370: Explicit-approved live memory wave

Date: 2026-07-16

## Goal

Allow a user to authorize one recommended account-backed memory endurance wave without allowing the scheduler, an Agent, a stale report, a changed Provider binary, or a replayed request to grant execution authority.

The lifecycle must keep recommendation, approval, execution, and wave success as four separate claims.

## Bound approval preview

The read-only preview binds the current checksum-valid endurance report to:

- endurance report checksum;
- source/evidence fingerprint;
- Provider version epoch key;
- Provider semantic version set;
- Provider executable identity checksum set;
- Provider and model;
- group count, concurrency, timeout, and generated group prefix;
- complete plan checksum.

It also probes the currently installed Provider. `approvable` is true only when the current semantic version and executable identity exactly match the signed child evidence, the endurance gate passes, and the recommendation remains advisory-only.

Preview always returns:

```text
liveExecutionAuthorized = false
receiptCreated = false
```

Reading Memory Center, Cron status, or the CLI preview cannot create an approval.

## Approval receipt

An approval requires all of:

```text
explicitApproval = true
riskAccepted = true
approvedBy = <non-empty actor>
enduranceReportChecksum = <current checksum>
planChecksum = <current plan checksum>
```

The receipt is:

- HMAC-signed with a private local 256-bit secret;
- checksum-valid and body-free;
- valid for 30 minutes by default;
- single-use;
- generation, source, version, executable, and plan bound;
- marked `schedulerCreated = false` and `schedulerExecutable = false`.

Only one active, unexpired approval may exist for the same plan. A second approval attempt fails closed.

## Execution claim

Execution is a separate command and requires:

```text
receiptId
receiptChecksum
explicitExecution = true
```

Before launch, CCM revalidates the HMAC, expiry, single-use state, latest endurance generation, source fingerprint, Provider version key, plan checksum, semantic version, and executable identity.

The receipt is durably changed from `approved` to `claimed` and consumed before the runner starts. A crash after claim can never replay the same approval. Restart reconciliation seals a stale claim as `interrupted`.

The runner result is accepted only when its durable multi-group report:

- remains inside the managed report directory;
- has a valid schema and checksum;
- matches Provider, model, group count, concurrency, and approved group prefix;
- matches the returned report checksum.

Execution lifecycle states are:

```text
approved
claimed
completed
completed_with_failures
execution_failed
interrupted
revoked
```

`completed` requires every approved group to pass. A valid report with failed groups is `completed_with_failures`; it is not promoted to success.

## Revocation

An unconsumed approval can be explicitly revoked with its current receipt id/checksum and `explicitRevocation=true`. Revocation consumes and re-signs the receipt. It cannot be restored or executed.

Expired receipts are displayed as `expired` and no longer count as active approvals. Invalid or tampered receipts remain visible as invalid diagnostics.

## Provider identity reproof

Changing the Provider executable invalidates an approval even when the version text is later changed back. Version text alone cannot restore authority because executable identity includes the resolved files, sizes, and modification times.

A changed identity must first produce new signed child evidence and a new endurance report. Only that reproof can make a new plan approvable.

## Memory Center and CLI

Memory Center shows the exact Provider/model/groups/concurrency/timeout plan plus approved, completed, failed, and revoked counts.

The `批准建议波次` action opens an explicit confirmation modal and creates only the receipt. When an active receipt exists, the same control becomes `撤销波次批准`. Memory Center does not expose an implicit execution action.

CLI surfaces are:

```text
npm run memory:live-wave:preview
npm run memory:live-wave:inventory
node scripts/task-agent-live-memory-wave-approval.mjs approve ...
node scripts/task-agent-live-memory-wave-approval.mjs execute ...
```

The execute command is the only surface in this phase that can launch the live multi-group Provider script, and only after a valid receipt claim.

## Real production preview

The production-home preview currently reports:

- approvable: true;
- Provider: Codex;
- model: `gpt-5.4-mini`;
- Provider version: `0.115.0`;
- executable identity checksum: `5adc0fe84a7072d248b6fe02337e773bd2b9330584a1e450bdbdc523aef065ff`;
- groups: `3`;
- concurrency: `1`;
- timeout: `180000 ms`;
- endurance report checksum: `f3198302cd501ff72e18ec22d0aea738aabeea4d9528ad9dedd529cf6d7840b6`;
- plan checksum: `18d684f363e36993edf7f3c8fd97408e0c8a0c060472fd0a00bdff6b00d4fa2b`.

Production approval inventory remains:

- approvals: `0`;
- claimed: `0`;
- completed: `0`;
- failed: `0`;
- revoked: `0`;
- invalid: `0`.

No production receipt was created and no account-backed wave was executed during this phase.

## Deterministic verification

The Phase 370 harness uses a controlled local Codex executable and no network access. It verifies:

- runtime/version/executable binding;
- read-only Memory Center GET;
- explicit Memory Center POST approval;
- HMAC and checksum validation;
- missing explicit approval and wrong plan rejection;
- duplicate active approval rejection;
- successful single-use execution;
- replay rejection;
- invalid execution report consumption and failure;
- expiry and tamper detection;
- explicit revocation and revoked replay rejection;
- stale endurance generation rejection;
- Provider version/identity drift rejection;
- version-text restoration still requiring new identity reproof;
- durable claim before execution;
- restart sealing of stale claims as interrupted;
- Memory Center approval inventory parity.

Result: `55/55`.

## Retention dry-run

The production report inventory after corrected semantic-version evidence contains:

- reports: `23`;
- valid reports: `20`;
- fail-closed old-format or invalid reports: `3`;
- endurance reports: `5`;
- referenced multi reports: `3`;
- referenced child reports: `6`;
- prune candidates: `0`.

No production report, memory receipt, recovery ledger, continuation ledger, or approval receipt was deleted.

## Regression summary

- Phase 370 approved wave lifecycle: `55/55`
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
- Cron API reliability: passed

Total targeted memory checks: `577/577`.

## Remaining parity work

- Add bounded retention and fail-closed cleanup for terminal approval receipts.
- Execute an account-backed recommended wave only after an actual user creates and submits a receipt.
- Persist cross-version execution comparison after the installed Codex identity changes.
- Obtain equivalent account-backed receipt recovery for Claude Code and Cursor when their native environments are responsive.
- Prove multiple simultaneous exact-group recoveries across a real Provider transition.

The long-term Claude Code parity goal remains active. Recommended live work is now gated by a signed, expiring, single-use, version-bound user approval lifecycle.
