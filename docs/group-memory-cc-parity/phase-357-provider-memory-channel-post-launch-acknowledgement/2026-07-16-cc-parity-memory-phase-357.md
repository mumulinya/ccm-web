# Phase 357: Provider memory channel post-launch acknowledgement

Date: 2026-07-16

## Goal

Upgrade task-agent memory delivery from a launch-time channel construction proof to a two-stage proof that also confirms the Provider process accepted the launch contract and established the expected execution/session contract.

Phase 356 proved that the final command, trusted envelope, authority file, Provider version, and runtime identity were correctly bound before spawn. It did not prove that a Provider successfully parsed that channel and entered a real execution session.

## Acknowledgement levels

Provider capabilities expose different public confirmation strengths. Phase 357 records those differences rather than presenting every success as the same assurance level.

| Provider | Policy | Required post-launch signal |
| --- | --- | --- |
| Codex | `structured_thread_started` | Recognized `thread.started`, trusted `thread_id`, matching runtime identity, and verified native-session evidence |
| Cursor | `structured_session_event` | Recognized structured event with trusted `session_id`, matching runtime identity, and verified native-session evidence |
| Claude Code | `process_exit_success` | Runner started, CLI parsed the system-prompt-file launch, and process completed successfully |
| Other fallback Providers | `process_exit_success` | Runner started and process completed successfully |

Claude Code's public print-mode contract does not return a structured receipt saying that a system prompt file became a model-role message. Phase 357 therefore records exit-success assurance explicitly and does not overstate it as a structured role acknowledgement.

## Two-stage evidence

### Stage 1: launch ready

`bindProviderMemoryChannelLaunch()` produces version 2 launch evidence with:

- `acknowledgement_status = pending`;
- channel/role and trusted-envelope bindings;
- system/developer file checksums;
- command, Provider version, runtime identity, and runner-request bindings.

Launch-only evidence can no longer satisfy production task-agent memory delivery.

### Stage 2: Provider acknowledged

After Provider output normalization and native-session validation, `acknowledgeProviderMemoryChannelLaunch()` binds:

- launch evidence checksum;
- execution success, runner-start state, and exit code;
- Provider output-contract checksum and contract id;
- matched event and trusted Provider session id;
- native-continuation evidence checksum;
- acknowledgement policy and timestamp.

The verifier reconstructs the original launch projection, validates the acknowledgement checksum, and revalidates structured output/session evidence when required.

## Production enforcement

All four production task-agent memory snapshot bindings now set:

```text
requireProviderMemoryChannelAcknowledgement: true
```

The requirement is persisted in the memory-context snapshot and propagated through:

- ordinary group task dispatch;
- group retry/rebind dispatch;
- direct group task dispatch;
- auto-assign dispatch;
- external runner fallback;
- durable direct-dispatch spool.

Both `backend/agents/runner.ts` and `backend/server.ts` finalize acknowledgement only after Provider output and native-session evidence exist. Failed acknowledgement blocks the runner result before memory delivery can commit.

`recordTaskAgentMemoryContextDelivery()` verifies the acknowledgement against the exact output-contract/native-session evidence supplied by that runner attempt. Missing, drifted, cross-runtime, or launch-only evidence produces `provider_memory_channel_unverified` and rejects the memory snapshot sync commit.

## Memory Center

Inventory and Memory Center reports now expose:

- `providerMemoryAcknowledgementRequiredCount`;
- `providerMemoryAcknowledgedCount`;
- `providerMemoryAcknowledgementUnverifiedCount`;
- `providerMemoryStructuredAcknowledgedCount`;
- `providerMemoryExitSuccessAcknowledgedCount`.

This keeps strong structured acknowledgements separate from weaker but honest exit-success acknowledgements.

## Verification

Phase 357 restart self-test covers:

- acknowledged Codex developer-memory delivery;
- acknowledged Claude Code system-memory delivery;
- launch-only rejection;
- Codex output-contract drift rejection;
- runtime identity mismatch rejection;
- direct-spool acknowledgement persistence and verification;
- restart recovery and Memory Center counts;
- static enforcement at all four production entry points.

Results:

- Phase 357 acknowledgement restart: `38/38`
- Phase 352 prompt injection proof: `27/27`
- Phase 353 continuation baseline proof: `29/29`
- Phase 354 trusted envelope proof: `31/31`
- Phase 355 Provider authority channel proof: `37/37`
- Phase 356 Codex developer channel: `45/45`
- Native continuation/rebudget: `28/28`
- Direct dispatch spool: `39/39`
- Runtime initial/resume session self-test: pass

## Remaining parity work

- Add a Provider-generated memory-use receipt when a runtime exposes an authoritative role/input echo or trace contract.
- Continue probing Cursor and other Providers for stable higher-authority instruction channels.
- Correlate acknowledgement quality with downstream memory-use/consumption evidence so delivery and actual use remain separate, measurable claims.

The long-term Claude Code memory parity goal remains active.
