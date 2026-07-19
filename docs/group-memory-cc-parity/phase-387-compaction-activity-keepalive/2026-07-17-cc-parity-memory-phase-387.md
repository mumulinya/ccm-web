# Phase 387: Compaction activity keep-alive

Date: 2026-07-17

## Goal

Keep a long-running Group Main Agent compaction visibly and durably alive while its model-summary request is waiting, while preserving CCM's exact `groupId + gcs_*` ownership across multiple server processes.

This phase extends the Phase 386 lifecycle commit fence. The fence prevents a stale response from committing; the activity lease prevents a second process from starting the same conversation compaction while the first process is still legitimately waiting.

The Global Agent remains global-context-only. No group conversation transcript or activity ledger is added to Global Agent context.

## Claude Code source audit

The local Claude Code implementation was re-audited at:

- `D:\claude-code\src\services\compact\compact.ts`.

During a long compact request Claude Code periodically reports session activity, republishes the compacting state, and keeps an abort controller attached to the in-flight summarizer request.

CCM now preserves those semantics in a process-independent form appropriate for multiple group conversations and multiple Node processes.

## Durable exact-session activity

Each production compact has a checksummed, body-free activity ledger at an exact conversation scope:

```text
group-compaction-activity/<groupId>/<gcs_*>.json
```

The ledger records:

- exact group and conversation identity;
- lifecycle generation, head ID, and head checksum;
- owner process and hostname;
- operation ID, stage, heartbeat sequence, and lease expiry;
- model-wait heartbeat count;
- terminal status, compact boundary, and compact transaction checksum;
- up to 20 recent terminal activities.

No transcript, prompt, model response, or memory body is stored in the activity ledger.

The default lease is 90 seconds and the default heartbeat interval is 30 seconds. Both remain configurable for deterministic local testing.

## Admission and recovery

`startGroupCompactionActivity()` acquires an atomic file lock and admits work only when:

- the exact `gcs_*` lifecycle fence is current;
- no live owner holds an unexpired lease for that conversation.

This makes duplicate-compaction admission work across CCM server processes instead of relying only on an in-process `Set`.

An expired lease or dead owner is reconciled to `interrupted`. A later process may then safely compact the same conversation. Sibling conversations in the same group remain independent.

Archiving or deleting a conversation invalidates its lifecycle fence. Deletion removes the activity sidecar, and a delayed heartbeat from the old operation fails closed without recreating it.

## Model wait and cancellation

The production compaction engine pulses the activity ledger throughout lifecycle phases. While the model summary request is pending it emits the `model_summary_wait` heartbeat on the configured interval.

If a heartbeat cannot revalidate the exact lifecycle or operation ownership, the request's abort controller is triggered. PreCompact and PostCompact boundaries also pulse through the same exact-session callback.

Every success, skip, model failure, and lifecycle-stale outcome closes the durable activity with a terminal status. A successful terminal row binds the compact boundary and compact transaction receipt checksum.

## Memory Center

Memory Center now exposes `Compaction Activity Keep-alive` for the selected group conversation. It reports:

- running, completed, interrupted, failed, or waiting status;
- exact `gcs_*` scope;
- current stage and operation ID;
- heartbeat count and lease state;
- checksum validity and recent terminal history.

The panel reconciles dead owners before presenting status and cannot borrow evidence from another conversation.

## Verification

Phase 387 command:

```text
npm run test:group-compaction-activity-keepalive-restart
```

Result: `23/23`.

The dedicated test uses a local OpenAI-compatible HTTP fixture and proves:

- repeated heartbeats while a real HTTP summary request is waiting;
- completed terminal state bound to the compact transaction and boundary;
- valid, body-free persistence and tamper rejection;
- Memory Center visibility;
- second-process rejection while another process owns the lease;
- dead-process recovery to `interrupted`;
- deletion cleanup and stale-heartbeat rejection;
- exact-session independence and restart persistence.

Compatibility regression:

- Phase 386 compaction session lifecycle fence: `32/32`;
- Phase 320 compaction summary input projection: `21/21`;
- Phase 295 compact restart soak: `11/11`;
- Phase 275 auto-compaction exact-session scope: `12/12`;
- Phase 332 post-compact session reset: `14/14`;
- Phase 265 Task Agent lifecycle fence: `31/31`;
- Phase 264 compact-head fence: `38/38`;
- Phase 292 compact-hook session isolation: `27/27`.

Compatibility total: `186/186`.

Phase 376-387 focused memory chain: `620/620`.

Targeted memory checks through Phase 387: `1476/1476`.

## Production state

No paid Claude Code, Codex, Cursor, Anthropic, or OpenAI Provider call was executed. All model waits and process transitions used local deterministic fixtures.

The long-term Claude Code parity goal remains active.
