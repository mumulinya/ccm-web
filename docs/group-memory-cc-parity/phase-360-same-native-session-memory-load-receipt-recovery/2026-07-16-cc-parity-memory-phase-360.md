# Phase 360: Same-native-session memory load receipt recovery

Date: 2026-07-16

## Goal

Recover safely when a third-party project child Agent completed useful work but omitted the Phase 358 `acknowledge_memory_context` MCP call.

Before this phase, a missing receipt was treated like an ordinary execution failure. The group main Agent could switch Provider and replay the entire task, risking duplicate code changes even though the first Provider run had already modified the workspace.

The required behavior is now:

1. hold the completed Provider result;
2. resume the exact same trusted native session once;
3. request only the missing MCP acknowledgement;
4. commit the original result if the signed receipt appears;
5. otherwise fail closed and suppress automatic whole-task replay.

## Recovery protocol

`ccm-memory-context-consumption-recovery-v1` binds:

- challenge id;
- parent and recovery runner request ids;
- group and exact `gcs_*` session;
- task, execution, and project;
- exact `tas_*` task-agent session;
- Provider and native session id;
- parent native-continuation evidence checksum;
- trusted-memory envelope and source checksums;
- one-attempt policy;
- receipt signature and recovery native-continuation evidence.

Each state is HMAC-signed with the internal MCP secret and persisted under:

```text
~/.cc-connect/memory-context-consumption-recoveries/
```

States are `prepared`, `running`, `recovered`, `blocked`, or `not_needed`.

## Eligibility

Automatic recovery is allowed only when:

- the original Provider process completed;
- the only receipt failure is `receipt_missing`;
- the challenge remains valid and exactly bound;
- the Provider has a verified reusable native session;
- native Provider contract continuity is available;
- no recovery attempt has already been consumed.

Tampered, mismatched, or otherwise invalid receipts are not overwritten. Providers without trustworthy native continuation remain fail-closed.

## Receipt-only continuation

The recovery prompt explicitly forbids:

- repeating or redoing the task;
- changing files;
- inventing a challenge id;
- treating the recovery as semantic memory usage.

The challenge id is deliberately absent from the recovery prompt. The model must read it from the immediately preceding trusted-memory turn in the same native session. It then calls the existing signed `ccm__knowledge_context/acknowledge_memory_context` tool.

This prevents a standalone challenge-id reminder from being mistaken for proof that the model retained access to the original trusted context.

## Bounded retry

The policy is fixed to:

```text
same_native_session_receipt_only_once
```

with:

- `max_attempts = 1`;
- `task_reexecution_allowed = false`;
- a 15–60 second recovery execution window;
- the original Provider output and file changes held unchanged.

A successful recovery commits the original work. A failed or unavailable recovery sets `suppress_task_replay = true`.

## Production integration

Recovery is wired into:

- external Agent runner;
- direct server CLI dispatch;
- Claude Code, Codex, and Cursor native resume commands;
- durable direct-dispatch spool;
- task-agent memory delivery receipts;
- ordinary group dispatch and Provider fallback loop;
- direct group task dispatch;
- auto-assign dispatch.

The group main Agent checks `suppress_task_replay`. When set, it stops Provider switching and whole-task replay, records a blocked timeline event, and preserves the workspace for explicit review.

Spawn-permission fallback also honors replay suppression, so a failed receipt-only continuation cannot accidentally trigger the full task through the external runner.

## Restart and audit

Recovery records survive restart and are reverified independently. Idempotent checks preserve the original `recovered` conclusion instead of overwriting it with `not_needed`.

Task-agent delivery receipts persist:

- recovery presence;
- recovery id and status;
- recovery signature validity;
- recovery issues;
- the signed recovery record.

The delivery inventory counts recovered, blocked, and invalid recovery proofs.

## Memory Center

The task-agent memory report and UI now expose:

- total recovery attempts;
- recovered attempts;
- blocked/running/invalid attempts;
- whole-task replay suppressions;
- exact group/session recovery rows.

Group-scoped reports only include recovery records from the selected group. Recovery records contain checksums and identifiers, not memory or Provider-output bodies.

Historical blocked recoveries produce a warning; invalid signed evidence produces a failure. An active delivery with a missing receipt remains failed through the existing snapshot gate.

## Verification

The Phase 360 restart self-test covers:

- a reusable Claude Code native session;
- exactly one continuation attempt;
- challenge id absence from the recovery prompt;
- explicit no-task-reexecution language;
- real signed receipt creation after the simulated model call;
- signed recovery proof verification;
- delivery-receipt rebinding and restart inventory;
- idempotent preservation of the original recovered state;
- no-session fail-closed behavior;
- second omission blocking;
- tampered receipt non-recoverability;
- sibling-group isolation;
- Memory Center counters;
- production runner and replay-suppression wiring.

Results:

- Phase 360 receipt recovery/restart: `44/44`
- Phase 359 receipt lifecycle/restart: `40/40`
- Phase 358 model-side receipt/restart: `36/36`
- Phase 357 Provider acknowledgement/restart: `38/38`
- direct dispatch spool: `39/39`
- full frontend, MCP, and backend build: pass

## Remaining parity work

- Add bounded retention and orphan reconciliation for recovery-ledger records themselves.
- Run real Provider omission/recovery soaks for Claude Code, Codex, and Cursor version matrices.
- Correlate recovered `loaded_unreported` outcomes with later item-level usage without treating correlation as proof.
- Continue high-concurrency and crash-injection work across multiple groups.

The long-term Claude Code memory parity goal remains active.
