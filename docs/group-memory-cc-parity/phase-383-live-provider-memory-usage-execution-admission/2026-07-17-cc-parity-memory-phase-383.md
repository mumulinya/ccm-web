# Phase 383: Live Provider memory usage execution admission

Date: 2026-07-17

## Goal

Close the gap between Phase 382's signed authorization lifecycle and the native/external Provider runner. A shaped object containing `approved=true` and a 64-character checksum must never be enough to label traffic account-backed. Every real full, delta, or continuation call must consume one exact slot from the signed plan before Provider launch and remain bound to one group session, task, Provider binary, and cost ceiling.

## Audit findings

The Phase 382 authorization store was strong, but the final runner projection trusted two caller-controlled fields:

```text
authorization.approved === true
authorization checksum has 64 hex characters
```

It did not verify the local HMAC, durable receipt state, atomic claim, exact execution slot, Provider/model/runtime identity, or `gcs_*` binding.

The audit also found three lifecycle weaknesses:

- completion and revocation did not re-verify the receipt HMAC;
- a claimed plan did not block creation of another authorization for the same plan;
- the fixed 15-minute interruption window was shorter than an 18-call sequential plan with a 180-second per-call timeout.

All three are now closed.

## Signed execution manifest

`ccm-live-provider-memory-usage-execution-manifest-v1` is stored under CCM's reliability directory and sealed by a separate durable HMAC secret.

A manifest can be created only after a checksum-valid approved authorization passes exact target preflight and is atomically claimed. The target set must contain the plan's exact group count, distinct group IDs, distinct `gcs_*` session IDs, and a project for every group.

The default two-group plan expands into 18 deterministic slots:

```text
2 exact group sessions
x full, delta, continuation
x 3 samples per mode
= 18 single-call slots
```

Every slot contains:

- target group and exact `gcs_*`;
- project;
- transport mode;
- sample ordinal;
- per-call cost ceiling;
- deterministic slot ID and checksum;
- durable pending, claimed, completed, failed, or interrupted state.

## Pre-launch admission

Before either the native CLI or external Agent Runner can start account-backed work, CCM now verifies:

- supplied authorization HMAC and `claimed + consumed` state;
- current durable authorization checksum;
- manifest HMAC and current durable checksum;
- manifest-to-authorization checksum binding;
- slot is currently claimed and checksum-matched;
- Provider and model equal the sealed plan;
- semantic version and executable identity are in the sealed endurance identity set;
- group, exact session, project, task ID, and `tas_*` equal the slot claim.

Failure raises `CCM_LIVE_MEMORY_USAGE_ADMISSION_BLOCKED` before Provider command launch. Ordinary project tasks that do not claim to be account-backed continue through their existing path.

The old approval-shaped shortcut has been removed.

## Cost and replay fencing

A slot is claimed durably before a Provider call. The same slot cannot be claimed twice. Completion requires a checksum-shaped usage receipt and observed cost at or below the per-call cap.

The usage provenance projection now carries:

- authorization checksum;
- execution manifest checksum;
- execution slot checksum;
- explicit runner-admission verification state;
- Provider runtime identity checksum.

After slot completion, its old admission bundle no longer validates because both the slot state and manifest checksum changed.

The authorization cannot settle until all 18 slots are completed and both exact-session baseline previews are publishable. Settlement derives call count and observed total cost from the durable slots rather than trusting caller totals.

## Recovery

Stale claimed slots become `interrupted` and the manifest becomes `measurement_failed`; they never return to pending.

The authorization interruption window now defaults to:

```text
max(15 minutes, planned calls x per-call timeout + 5 minutes)
```

The default plan therefore receives enough time for its sealed sequential budget. Tests and operators may still provide an explicit shorter reconciliation threshold for deterministic recovery.

`approved` and `claimed` receipts both block a second authorization for the same plan.

## Read-only operations

Memory Center exposes execution state without exposing execution:

```text
GET /api/memory-center/live-usage-execution
```

It displays ready, running, measurements-complete, settled, failed, and invalid manifest counts beside authorization state.

The audit CLI is also read-only:

```text
npm run audit:task-agent-live-memory-usage-execution
node scripts/task-agent-live-memory-usage-execution.mjs --preview --receipt-id <id> --targets-file <json>
```

There is intentionally no Memory Center execution button and no CLI execution command. Actual execution remains a separately invoked, explicitly authorized operation.

## Verification

Phase 383 command:

```text
npm run test:task-agent-live-memory-usage-execution-restart
```

The two-process harness covers:

- exact two-group target preflight;
- duplicate group and session rejection;
- approved-to-claimed authorization transition;
- 18 unique deterministic slots;
- dynamic execution timeout budget;
- forged HMAC rejection;
- concurrent plan rejection;
- exact runner admission;
- wrong `gcs_*` and runtime rejection;
- slot replay rejection;
- per-call cost overrun;
- 18-slot measurement closure;
- two publishable exact-session baselines;
- authorization and manifest settlement;
- stale slot interruption;
- manifest tamper detection;
- restart persistence;
- Memory Center report and GET API;
- read-only audit CLI;
- runner pre-launch source ordering;
- continued absence of a paid execution button.

Result: `48/48`.

Compatibility regression:

- Phase 382 authorization lifecycle: `50/50`;
- Phase 381 live usage baseline: `48/48`;
- frontend production build: passed.

Phase 376-383 focused memory chain: `478/478`.

Targeted memory checks through Phase 383: `1334/1334`.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in Phase 383. The harness uses an isolated fake Codex binary and deterministic Provider usage while exercising real CCM HMAC secrets, atomic files, restart recovery, exact-session baseline logic, runner admission, Memory Center projections, and production CLI entry points.

The current Codex binary identity still differs from the latest endurance identity. A real version-transition canary and endurance reproof remain mandatory before Phase 382 can create a production usage authorization. Phase 383 does not bypass or simulate that account-backed evidence.

The long-term Claude Code parity goal remains active.
