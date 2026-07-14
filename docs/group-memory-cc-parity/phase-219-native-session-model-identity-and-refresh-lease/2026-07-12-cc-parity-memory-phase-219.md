# Phase 219: Native-session model identity and refresh lease

Date: 2026-07-12

## Goal

Reuse model-specific capacity only when CCM knows which model a particular third-party native session actually uses, and make refresh queue generation single-writer across multiple CCM processes.

## Native-session model identity

A verified native capability record now updates the task-Agent session with:

- `modelId`
- `modelContextWindow`
- `capacityEvidenceChecksum`
- `modelCapabilitySource`
- `modelCapabilityCheckedAt`

These fields are written together with the successful native session turn. The native session id and model identity therefore share the same platform-observed execution boundary.

On a resumed group child-Agent session, CCM passes the persisted model id into `buildSelfContainedWorkerHandoff`. Direct task-queue dispatch looks up the existing open task session before constructing its handoff and does the same.

Safety rule:

- Exact provider + model identity may use a model-specific cached capacity.
- Provider-only dispatch does not borrow a model-specific large window.
- Unknown model identity continues to use a provider default setting or the conservative 200K fallback.

## Refresh queue lease

Refresh queue generation now uses:

- Lease: `~/.cc-connect/memory-control/model-capability-refresh-queue.lease.json`
- Journal: `~/.cc-connect/memory-control/model-capability-refresh-queue.jsonl`
- Status: `~/.cc-connect/memory-control/model-capability-refresh-status.json`
- Queue: `~/.cc-connect/memory-control/model-capability-refresh-queue.json`

Lease schema:

`ccm-model-capability-refresh-lease-v1`

Properties include lease id, owner PID/hostname/instance, TTL, fencing token, recovery count, status, acquisition time, expiry, release time, and stable checksum.

Acquisition uses atomic `wx+`. An active local lease requires a live PID and unexpired TTL. A dead or expired owner may be recovered; fencing tokens advance using both the abandoned lease and the durable journal. Invalid lease checksums fail closed.

Only the lease holder writes the refresh queue. Competing processes return `lease_busy` and write no queue. The lease is released only by its matching holder.

## Scheduler and UI

The hourly scheduler now calls the leased maintenance operation instead of writing the queue directly. Memory Center receives the latest refresh status and displays fencing token plus owner PID.

## Verification

Model identity regression proves:

1. Native model id, capacity, source, checksum, and timestamp persist on the task session.
2. A resumed exact model uses its 516K capacity and 496K effective budget.
3. The same provider without model identity does not borrow that model-specific capacity and remains at the conservative 180K effective budget.

The real two-process race proves:

1. The first Node process acquires and completes.
2. The contender returns `lease_busy`.
3. Only the holder writes the queue.
4. The holder has a positive fencing token.
5. An expired/dead lease is recovered.
6. Recovery advances the fencing token.

Required gates are TypeScript checks, backend and frontend production builds, capacity regression, real process race, runtime API inspection, self-test residue inspection, and `git diff --check`.

## Follow-up

The next phase should bind model identity to native-session history during provider switches and permission-drift recovery, and add refresh-result acknowledgements so due requests can distinguish refreshed, unsupported, and provider-metadata-absent outcomes.
