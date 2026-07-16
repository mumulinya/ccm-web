# Phase 362: Memory recovery Provider fault soak

Date: 2026-07-16

## Goal

Prove that same-native-session memory-load receipt recovery remains durable across installed Provider versions, process crashes, and restart reconciliation. The proof must preserve exact `group_id`, `gcs_*`, and `tas_*` ownership and must never infer success from a receipt file alone.

## Recovery soak evidence

The existing task-agent continuation soak ledger now records compact, body-free memory recovery evidence. Each signed hash-chain event can retain:

- recovery id, status, policy, attempt, and challenge id;
- receipt signature and replay-suppression state;
- recovery native-continuation checksum and acknowledgement state;
- Provider runtime version and executable identity checksum;
- injected fault point and restart-reconciliation state.

The report aggregates committed, blocked, fault-injected, restart-reconciled, replay-suppressed, and native-acknowledged recovery counts. It also reports distinct Provider and Provider-version coverage without storing prompt bodies or Provider output.

## Durable fault boundaries

Recovery supports deterministic crash injection at four production boundaries:

```text
after_running_before_provider
after_provider_before_receipt_verify
after_receipt_verify_before_recovery_commit
after_recovery_commit_before_return
```

The first three boundaries leave a signed `running` record. A later startup pass seals a stale record as `interrupted` with `suppress_task_replay = true`.

The final boundary crashes only after the signed recovery commit. It therefore leaves `recovered`, including verified receipt continuity and native-continuation commit evidence.

Injected crashes bypass the ordinary recovery catch path. This preserves the same durable state that an actual process termination would leave at each boundary.

## Commit safety

A receipt written before the process crash is not sufficient to promote recovery to success. CCM requires all of the following before writing `recovered`:

- a valid exact-session memory challenge and receipt signature;
- a verified same-native-session continuation;
- native continuation acknowledgement under the Provider contract;
- a signed recovery record committed atomically.

If restart reconciliation finds a receipt without the continuation commit proof, the record remains `interrupted` and reports `interrupted_receipt_present_without_continuation_commit`.

## Provider matrix

The Phase 362 test probes the installed real CLI executables and validates their native-resume command contracts:

| Provider | Installed version |
| --- | --- |
| Claude Code | `2.1.201` |
| Codex CLI | `0.115.0` |
| Cursor Agent | `2026.07.09-a3815c0` |

For deterministic omission recovery, the continuation output is supplied by a controlled Provider adapter. This proves CCM command construction, version identity, receipt verification, continuation evidence, crash boundaries, and restart durability. It does **not** claim that Phase 362 executed live account-backed model requests over the network.

## Memory Center

Memory Center exposes fleet and exact-group recovery soak counters for:

- recovery events and committed outcomes;
- blocked and replay-suppressed outcomes;
- fault injections and restart reconciliations;
- native acknowledgement coverage;
- distinct Providers and Provider versions.

The report remains diagnostic-only and is not injected into Agent prompts. Exact-group filtering prevents sibling group identities from leaking into another group report.

## Verification

The Phase 362 isolated-`HOME` restart test covers three Provider fixtures, four fault boundaries, signed hash-chain persistence, real process epoch change, Memory Center aggregation, and sibling-group isolation.

Results:

- Phase 362 Provider/fault/restart soak: `62/62`
- Phase 360 same-session receipt recovery/restart: `44/44`
- Phase 361 recovery-ledger lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- Provider contract/version soak: `58/58`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

Phase 362 produced seven valid exact-session recovery chains, four committed recoveries, four injected faults, three restart reconciliations, three Provider identities, and three Provider-version identities.

## Remaining parity work

- Run opt-in, account-backed live omission/recovery calls for Claude Code, Codex, and Cursor without weakening deterministic CI coverage.
- Run multi-hour and multi-day concurrent soak across many groups, `gcs_*` sessions, and `tas_*` sessions.
- Exercise Provider upgrades during an active recovery fleet and retain before/after executable identities.
- Correlate `loaded_unreported` recovery with later item-level access evidence without treating correlation as semantic proof.
- Continue closing observed differences when new Claude Code memory behavior becomes available for direct comparison.

The core memory system is production-capable and the long-term Claude Code parity goal remains active for these final environmental and endurance proofs.
