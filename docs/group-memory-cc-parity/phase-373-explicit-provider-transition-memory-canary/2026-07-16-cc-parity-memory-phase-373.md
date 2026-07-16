# Phase 373: Explicit Provider transition memory canary

Date: 2026-07-16

## Goal

Close the evidence-bootstrap gap after an installed Provider changes identity.

Normal live-wave approval correctly rejects an unproven runtime, but that runtime still needs a tightly bounded way to produce the first account-backed memory-continuity evidence. Phase 373 adds a separate, explicit, canary-only approval mode. It cannot authorize an ordinary task wave.

## Canary readiness

The transition canary preview starts from the latest checksum-valid endurance report and captures the currently installed Provider runtime.

It is approvable only when:

- the previous endurance report and evidence gate are valid;
- the previous latest version transition is either absent or verified;
- the recommendation remains advisory-only and non-executable;
- the Provider is Codex and the model remains bound to the previous evidence;
- the current semantic version and executable identity are valid;
- the current runtime does not match the last proven runtime.

Matching runtime identity never offers a canary. A degraded or insufficient previous baseline cannot bootstrap a new identity.

Preview always returns:

```text
liveExecutionAuthorized = false
receiptCreated = false
transitionAcknowledgementRequired = true
evidencePromotionRequired = true
```

## Fixed plan

The canary plan is not derived from arbitrary user input:

```text
groups = 2
concurrency = 1
timeout = bounded previous recommendation
provider/model = previous signed evidence
provider version = current runtime probe
runtime identity = current executable identity
mode = version_transition_canary
canaryOnly = true
```

It also binds the previous endurance checksum, source-set checksum, from/to version identity keys, current runtime snapshot checksum, generated group prefix, and complete plan checksum.

## Explicit receipt

Creation requires:

```text
explicitApproval = true
riskAccepted = true
transitionAcknowledged = true
approvedBy = <actor>
enduranceReportChecksum = <exact baseline>
planChecksum = <exact canary plan>
```

The receipt reuses the Phase 370 private HMAC, checksum, expiry, single-use claim, revocation, interruption, and retention lifecycle. Canary TTL is at most 15 minutes.

Only one active receipt may exist for the exact canary plan. A later Provider identity change invalidates the receipt before claim. Restoring only version text is insufficient; executable identity must also match.

## Execution proof

Claim occurs durably before the runner starts. The returned multi-group report must satisfy the ordinary provider/model/group/concurrency/prefix contract and the additional canary contract:

- account-backed report;
- exactly two unique groups and group sessions;
- isolation valid;
- both groups passed;
- both memory recovery receipts valid and recovered;
- both durable child reports checksum-valid and identity-bound;
- exact current semantic version and executable identity in each child;
- workspace unchanged;
- narrow receipt recovery completed without replaying or suppressing the already completed task.

Fixture-only, non-account-backed, wrong-version, wrong-identity, missing-child, failed-recovery, changed-workspace, or cross-group-collision evidence cannot be promoted.

## Evidence promotion

After valid child and multi-report verification, CCM runs the existing endurance audit. The receipt becomes successful only when:

- the newest endurance epoch key equals the canary target version key;
- the latest transition comparison is `verified`;
- the endurance evidence gate passes.

Successful receipts store `evidencePromotionStatus=promoted` plus the promoted endurance and source-set checksums. The ordinary approval preview then uses the newly signed runtime evidence.

Valid execution with unverified promotion becomes `completed_with_failures`. Invalid execution becomes `execution_failed` and does not run promotion. A crash before final receipt commit leaves the receipt claimed and single-use; the report can still be rediscovered by the scheduler.

## Retention

The approval reference graph now protects:

```text
canary receipt -> baseline endurance report
canary receipt -> execution multi report -> child reports
promoted canary receipt -> promoted endurance report -> source reports
```

Terminal canary receipts use the same explicit-only retention and fail-closed HMAC revalidation from Phase 371.

## Memory Center and CLI

When ordinary approval is unavailable because of an eligible runtime drift, Memory Center changes the action to `批准迁移 Canary`. The confirmation explains the fixed two-group shape, 15-minute single-use authority, possible Provider cost, and required promotion gate.

The API GET returns both ordinary and transition-canary previews. The POST action `approve_transition_canary` requires all explicit confirmations and writes a body-free audit record.

CLI surfaces are:

```text
npm run memory:live-transition-canary:preview
node scripts/task-agent-live-memory-wave-approval.mjs approve-transition-canary ...
node scripts/task-agent-live-memory-wave-approval.mjs execute ...
```

The existing execute command accepts either approval mode and derives the exact runner shape from the signed plan.

## Deterministic verification

The Phase 373 harness uses an isolated HOME and controlled local Codex executables. It verifies:

- healthy v1 baseline;
- v2 semantic/executable drift detection;
- ordinary approval blocked while canary becomes available;
- fixed two-group/concurrency-one plan;
- CLI and Memory Center preview parity;
- required transition acknowledgement;
- Memory Center explicit HMAC receipt creation;
- duplicate active receipt rejection;
- 15-minute maximum TTL;
- v3 drift invalidating an unclaimed v2 receipt;
- exact v2 identity restoration and current-plan revalidation;
- account-backed child/multi evidence validation;
- automatic endurance promotion;
- verified v1-to-v2 transition ledger evidence;
- ordinary approval reopening after promotion;
- canary no longer offered after promotion;
- single-use replay rejection;
- non-account-backed v3 evidence rejection without promotion;
- baseline, execution, and promoted report retention;
- receipt and Memory Center reconstruction after restart.

Result: `71/71`.

## Regression summary

- Phase 373 transition canary: `71/71`
- Phase 372 transition ledger: `71/71`
- Phase 371 approval retention: `65/65`
- Phase 370 approved wave lifecycle: `55/55`
- Phase 369 scheduler/version advisory: `51/51`
- Phase 368 endurance attribution: `45/45`
- Phase 367 report-set coordination: `35/35`
- Phase 366 report retention: `56/56`

Phase 366-373 related checks: `449/449`.

Targeted memory checks through Phase 373: `784/784`.

## Production preview

The read-only production preview reports:

- Provider: Codex `0.115.0`;
- executable identity checksum: `5adc0fe84a7072d248b6fe02337e773bd2b9330584a1e450bdbdc523aef065ff`;
- baseline and current version key: `893ff3cd92c658e0f8e2ffeee1e41240a3605bea5c485a41cdb02c7ee672bf84`;
- runtime drift detected: false;
- transition canary approvable: false;
- live execution authorized: false;
- receipt created: false.

No production approval, canary execution, Provider call, or evidence deletion occurred in this phase.

## Remaining parity work

- use this flow only after a real installed Provider identity changes and a user explicitly approves the canary;
- collect account-backed transition comparisons for Claude Code and Cursor when equivalent runners are available;
- prove simultaneous exact-group recovery across a real Provider transition;
- continue auditing future Claude Code memory behavior and migrate verified improvements.

The long-term Claude Code parity goal remains active. Ordinary multi-group session memory remains usable without a transition canary while the current runtime matches proven evidence.
