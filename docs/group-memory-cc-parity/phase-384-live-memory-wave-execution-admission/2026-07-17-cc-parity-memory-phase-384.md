# Phase 384: Live memory wave execution admission

Date: 2026-07-17

## Goal

Bring the real endurance wave, version-transition canary, and initial Provider baseline canary up to the same pre-call security standard as Phase 383's Usage Benchmark. A signed approval must not be bypassable by directly invoking either `--live` soak script.

## Audit findings

Wave approvals already used a durable local HMAC, exact Provider runtime identity, explicit claim, revocation, expiry, and report verification.

The remaining gaps were below the approval store:

- `task-agent-live-multi-group-memory-soak.mjs --live` could start without a claimed receipt;
- the native child `--live` entry point could also start directly;
- child groups had no one-time execution grants;
- finalization did not require child report checksums to be bound back to claimed group slots;
- approvals disclosed no planned call count or cost ceiling;
- cost acknowledgement was not explicit;
- a claimed plan did not block another approval for the same plan;
- the fixed ten-minute interrupted threshold could be shorter than the sealed sequential execution plan.

## Cost-bound plan

Every ordinary wave and canary plan now seals:

```text
planned Provider calls = groups x 2
default maximum per call = $0.20
default two-group maximum total = $0.80
```

The two calls per group are the initial turn and native resume or Codex receipt-recovery turn.

Receipt verification requires the call count, per-call cap, total cap, and exact arithmetic to remain valid. Approval creation requires `costAcknowledged=true` in addition to explicit approval and risk acceptance.

Memory Center displays Provider, model, planned calls, per-call cap, and maximum total cost for:

- endurance wave approval;
- version-transition canary approval;
- initial Provider baseline canary approval;
- Usage Benchmark authorization.

The modal requires separate risk and cost checkboxes. Creating approval still does not execute a Provider call.

## One-time group grants

Claiming a wave now creates one random 256-bit grant per planned group.

Only SHA-256 grant hashes enter the HMAC-sealed durable receipt. Plaintext grants exist only on the in-memory claim result and are passed to their designated child process. JSON serialization of the claimed receipt cannot reveal them.

Each durable slot follows:

```text
pending -> claimed -> completed
                   -> failed
```

The child must atomically claim its ordinal before any Provider invocation. Admission verifies:

- durable claimed receipt HMAC;
- execution ID;
- one-time grant hash;
- pending ordinal;
- exact group prefix;
- exact `gcs_*` identity;
- Provider and model matching the sealed plan.

A used grant cannot be claimed again.

## Entrypoint fencing

The production CLI passes the claimed receipt, execution ID, and in-memory grant set to the multi-group parent.

The parent validates the exact plan before starting children, then passes only the designated grant to each ordinal. The native child claims that grant before `prepareCodexHome()` or any Provider invocation.

Without signed claim data:

- multi-group `--live` exits at parent admission;
- native child `--live` exits at group admission;
- no Provider command starts.

Deterministic fixture adapters remain available for no-cost tests and are never classified account-backed.

## Finalization and recovery

Every child completion binds its signed single-report checksum into the corresponding durable group slot.

Wave finalization now requires:

- every planned slot completed;
- unique report group/session identities;
- every multi-report group matching one durable slot;
- every child report checksum matching the slot binding;
- all existing Provider/model/isolation/canary continuity checks.

The receipt may change as slots progress, so finalization re-verifies the latest durable HMAC and execution ID rather than trusting the original claimed checksum.

Concurrent `approved` or `claimed` receipts for the same plan are rejected. Expired approved receipts do not hold the plan open.

The default interruption window is derived from the sealed execution plan:

```text
batches = ceil(groups / concurrency)
window = batches x (2 x timeout + 60 seconds) + 60 seconds
effective window = max(10 minutes, window)
```

Each slot transition refreshes the execution heartbeat. Explicit shorter reconciliation thresholds remain available for deterministic recovery tests.

## Verification

Phase 384 command:

```text
npm run test:task-agent-live-memory-wave-execution-admission
```

The restart harness covers:

- four-call plan and `$0.80` total cap;
- missing cost acknowledgement rejection;
- parent `--live` denial without claim;
- child `--live` denial without grant;
- claimed receipt admission;
- plaintext grant non-persistence;
- forged checksum rejection;
- exact group grant claim;
- grant replay rejection;
- child report checksum completion;
- dynamic plan timeout;
- explicit interrupted recovery;
- full two-group settlement;
- grant-ledger HMAC tamper detection;
- restart persistence;
- Memory Center cost projection and absence of an execution button.

Result: `35/35`.

Compatibility regression:

- ordinary live wave approval: `55/55`;
- wave approval retention: `65/65`;
- version-transition canary: `71/71`;
- cross-Provider transition canary: `76/76`;
- initial Provider baseline canary: `96/96`;
- Phase 383 Usage Benchmark execution admission: `48/48`.

Phase 376-384 focused memory chain: `513/513`.

Targeted memory checks through Phase 384: `1369/1369`.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in Phase 384. The tests use fake Provider runtimes, deterministic reports, and explicit denial probes while exercising production HMAC files, child entry points, exact-session identities, claim/replay behavior, report promotion, restart recovery, and Memory Center bindings.

The current Codex executable identity still differs from the latest endurance evidence. A user-approved, cost-acknowledged version-transition canary is still required before production Usage Benchmark authorization can open. Phase 384 makes that future canary bounded and non-bypassable; it does not execute it.

The long-term Claude Code parity goal remains active.
