# Phase 364: Account-backed Codex memory receipt recovery

Date: 2026-07-16

## Goal

Obtain account-backed proof that a real installed project child Agent can retain group-session memory in its native session and use that retained context to recover a deliberately omitted model-load receipt. The recovery prompt must not repeat the challenge id, and success must require a signed `acknowledge_memory_context` MCP receipt rather than matching response text.

## Stage-aware live telemetry

The live Provider report is now `ccm-live-provider-native-memory-soak-report-v2`. It distinguishes:

- process start;
- first stdout event;
- native session establishment;
- turn start;
- Provider API retry;
- model output;
- terminal event;
- receipt recovery commit.

Every stage stores only event types, counts, durations, byte counts, identifiers, and checksums. Prompt bodies, random sentinels, challenge ids, model output, stderr text, and authentication material remain absent from durable reports and continuation ledgers.

Timeouts are classified as:

```text
provider_startup_timeout
provider_api_retry_timeout
provider_turn_timeout
provider_terminal_timeout
```

Memory Center exposes session establishment, model output, staged timeout, Provider/model coverage, and live receipt-recovery counters.

## Provider-specific probe models

Live probes can select models independently:

- Claude Code: `--claude-model`, default `sonnet`;
- Codex: `--codex-model`, default `gpt-5.4-mini`;
- Cursor: `--cursor-model`, default `gpt-5.4-mini-none`.

This prevents a slow or unsupported automatic model choice from being confused with native-session memory failure.

## Account-backed native recall

Installed Codex CLI `0.115.0` with `gpt-5.4-mini` completed the two-turn no-tools native recall probe:

1. The initial turn received a random sentinel and returned `INITIAL_OK` in 19.9 seconds.
2. The resume turn did not receive the sentinel and recalled it from the same native session in 45.1 seconds.

The session checksum remained identical, both turns had recognized `thread.started`, `turn.started`, model-output, and terminal events, and the temporary workspace remained unchanged.

Run id: `lpms_mrn4wazh_8299d65183`  
Report checksum: `24160b92583fdaae57efcf299f23503bfb5470a9bbe6657da40a4afc54de0fce`

## Account-backed receipt recovery

The dedicated command is:

```text
npm run soak:task-agent-live-codex-memory-receipt-recovery
```

The operation uses production components:

- signed `ccm-memory-context-consumption-challenge-v1` challenge;
- task-bound `ccm__knowledge_context` MCP server;
- isolated Codex runtime config and linked account authentication;
- production `recoverMemoryContextConsumptionReceipt()` policy;
- exact native session resume;
- signed receipt and recovery ledgers;
- continuation soak and Memory Center aggregation.

The first model turn received the challenge in trusted group-session context and was explicitly instructed to omit all MCP calls. CCM independently verified `receipt_missing` before recovery.

The second model turn received the production recovery prompt. That prompt contained no challenge id and prohibited task replay or file modification. Codex recovered the challenge from the previous native session turn and called the real `ccm__knowledge_context/acknowledge_memory_context` tool.

Results:

- initial controlled omission turn: passed in 37.3 seconds;
- exact-session receipt-only continuation: passed in 81.2 seconds;
- model receipt: present and signature-valid;
- recovery ledger: signed `recovered`;
- `suppress_task_replay`: `false`;
- native session checksum: unchanged;
- workspace checksum: unchanged;
- internal MCP audit: `acknowledge_memory_context`, `project-child-agent`, `ok`.

Run id: `lpms_mrn594es_4fa44c0b78`  
Report checksum: `8264ce6c3f1b43b1fa76610f63c298437e74d41d3612098cb26cf4bf8550f76b`

Independent post-run reads found one valid continuation chain, one required and passing receipt recovery, one signed recovered inventory row, one valid receipt, and one successful MCP audit event. Memory Center also reported the passing receipt recovery.

## Negative Provider observations

The stage-aware matrix also clarified the remaining Provider environment gaps:

| Provider | Model | Observation |
| --- | --- | --- |
| Cursor `2026.07.09-a3815c0` | `gpt-5.4-mini-none` | 120-second startup timeout, zero output bytes, no session |
| Claude Code `2.1.201` | `sonnet` | session established and first output at 1.1 seconds, then repeated Provider `api_retry` events without terminal output for 120 seconds |

Cursor is blocked before session establishment. Claude reaches the Provider API but is currently blocked by repeated API retries. Neither outcome is classified as a memory failure or a passing recall.

## Verification

- Phase 364 deterministic stream and receipt-recovery harness: `57/57`
- Phase 362 Provider recovery/fault matrix: `62/62`
- Phase 360 receipt recovery/restart: `44/44`
- Phase 361 recovery lifecycle/restart: `37/37`
- continuation soak/restart: `41/41`
- native continuation/rebudget: `28/28`
- direct dispatch spool: `39/39`

## Remaining parity work

- Obtain account-backed native recall and model receipt recovery for Claude Code after its Provider API retry condition clears.
- Obtain account-backed native recall and model receipt recovery for Cursor after its headless session startup becomes responsive.
- Run multi-hour and multi-day concurrent live soaks across independent groups, `gcs_*` sessions, and `tas_*` sessions.
- Exercise live Provider version upgrades while receipt recovery records are active.
- Continue adversarial comparison with future Claude Code memory behavior without reopening the now-proven Codex core path.

The long-term Claude Code parity goal remains active. Codex account-backed native recall and model-side receipt recovery are now proven rather than remaining estimated parity work.
