# Phase 363: Live Provider native-memory soak governance

Date: 2026-07-16

## Goal

Move the remaining Provider evidence gap from an informal manual operation to a bounded, body-free, auditable live soak. A live account call must prove that a Provider remembers a random group-session sentinel through its native session-resume mechanism. Timeout, launch failure, model failure, session mismatch, missing recall, or workspace modification must fail closed.

## Live soak command

The new entrypoint is:

```text
npm run soak:task-agent-live-provider-native-memory
```

Live execution is opt-in at the script boundary. The lower-level script requires `--live` or `CCM_RUN_LIVE_PROVIDER_MEMORY_SOAK=1`, preventing ordinary tests from spending account quota.

Each selected Provider receives two turns in an isolated temporary workspace:

1. The initial no-tools turn receives a random private sentinel and returns `INITIAL_OK`.
2. A native resume turn does not receive the sentinel and must recall it from the immediately previous session turn.

Claude Code runs in plan mode with write and network tools denied. Cursor runs in ask mode. Codex runs with a temporary `CODEX_HOME`, a copied authentication token, an explicit supported model, and a read-only sandbox policy. Temporary authentication material and workspaces are deleted after the run.

## Failure containment

Every Provider turn has a hard timeout. On Windows, timeout cleanup terminates the full child process tree. The operation verifies the workspace tree checksum before and after the call.

The durable report stores only:

- Provider and executable version identity;
- run, session, sentinel, and output checksums;
- stage status and duration;
- timeout and workspace-unchanged flags;
- bounded diagnostic category.

Prompt bodies, sentinels, model responses, stderr text, and authentication material are never persisted in the report or continuation soak ledger.

## Continuation soak and Memory Center

Live probe events are appended to separate `groupId + gcs_* + tas_*` continuation hash chains. Report aggregation now exposes:

- event and terminal counts;
- passed, timeout, unavailable, and failed counts;
- distinct Provider and Provider-version counts.

Any non-passing terminal event marks the live probe chain as warning with `live_provider_memory_probe_unproven`. Memory Center exposes the same counters in a `live memory probe` card.

## Codex resume correction

The live audit found that `codex exec resume` does not accept the top-level `--sandbox` flag. CCM previously generated that invalid command even though synthetic tests only checked for `resume` and the session id.

Codex native resume now carries sandbox policy through:

```text
-c sandbox_mode="read-only"
```

The Provider recovery matrix now explicitly rejects a Codex resume command containing `--sandbox` and requires the config override.

## Deterministic acceptance

The Phase 363 self-test uses a three-Provider process adapter and a separate timeout fixture. It verifies:

- two-turn same-session recall for Claude Code, Codex, and Cursor;
- isolated Provider hash chains;
- body-free reports and ledgers;
- report checksum verification;
- zero workspace changes;
- timeout process cleanup and fail-closed accounting.

Result:

- Phase 363 deterministic live-soak harness: `28/28`
- frontend Memory Center build: passed
- targeted runtime and continuation-soak TypeScript checks: passed

## Account-backed observations

The first account-backed matrix used installed CLI identities:

| Provider | Version | Result |
| --- | --- | --- |
| Claude Code | `2.1.201` | initial turn timed out after 30 seconds |
| Codex CLI | `0.115.0` | initial launcher selection failed before the corrected npm entrypoint |
| Cursor Agent | `2026.07.09-a3815c0` | initial turn timed out after 30 seconds |

Run id: `lpms_mrn3yboz_f78b1dafd1`  
Report checksum: `260d00be6fcb4f1afe0054185423dc403f466af36b166c02761ddf6b13782d79`

After correcting Codex launcher selection and choosing an account-supported model, a Codex-only rerun started successfully but timed out after 45 seconds:

Run id: `lpms_mrn43kzb_3fa5d1a3d1`  
Report checksum: `4ae37aa656a3794b543cf453f4b910c46ca37ee69e556df7ee1316dfe43fa4ca`

All observed workspaces remained unchanged and timeout cleanup left no Provider child processes. These account-backed runs are valid negative operational evidence. They do not prove live native-session memory recall, and CCM does not count them as success.

## Remaining parity work

- Repeat the account-backed matrix when Provider endpoints respond within a bounded window.
- Complete at least one initial-plus-resume recall proof for each installed Provider.
- Extend a passing live recall into the model-side `acknowledge_memory_context` omission/recovery path.
- Schedule multi-hour and multi-day multi-group endurance runs after the short live gate is healthy.
- Continue comparing newly observed Claude Code memory behavior without reopening already proven core isolation and recovery invariants.

The long-term Claude Code parity goal remains active. Phase 363 converts the live-environment gap into a safe, measurable gate instead of treating an unbounded CLI process as evidence.
