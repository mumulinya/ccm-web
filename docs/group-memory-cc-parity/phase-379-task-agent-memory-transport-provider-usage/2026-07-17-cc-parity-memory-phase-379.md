# Phase 379: Task-Agent memory transport Provider usage

Date: 2026-07-17

## Goal

Create durable, exact-session evidence for the Provider token and Prompt-cache behavior associated with task-Agent memory `full`, `delta`, and `continuation` transports.

Before this phase, CCM parsed a coarse `inputTokens/outputTokens/cost` object for project metrics. Cache creation/read details were folded into input and discarded, and collaboration completion callbacks did not bind usage to the memory delivery receipt. Project totals therefore could not prove what happened in an exact:

```text
group + gcs_* + task + tas_* + Provider native session + memory snapshot
```

## Provider normalization

`extractAgentCommandUsage()` now preserves:

- Provider input tokens;
- uncached/direct input tokens;
- cache creation input tokens;
- cache read input tokens;
- whether cache read is already included in Provider input;
- output and Provider total tokens;
- total cost when reported;
- explicit reported/unreported state and Provider identity.

The accounting rules avoid double counting:

- Claude/Anthropic usage reports direct input, cache creation, and cache read separately, so accounted input includes all three;
- Codex/OpenAI-style `input_tokens` or `prompt_tokens` includes `cached_input_tokens`/nested cached tokens, so cached input is retained as a detail but not added again;
- Cursor nested `prompt_tokens_details.cached_tokens` follows the same included-cache rule.

Observed deterministic format fixtures:

```text
Claude: input 420 = direct 100 + create 20 + read 300; output 40; total 460
Codex: input 1000 including cache 800; direct 200; output 100; total 1100
Cursor: input 500 including cache 350; direct 150; output 50; total 550
```

## Usage receipt

Every new exact-group delivery receipt contains `ccm-task-agent-memory-transport-usage-v1`.

It binds:

- group, `gcs_*`, task, `tas_*`, project, snapshot, runner request, and native session;
- Provider, model, runtime version, and Provider contract ID when available;
- `full`, `delta`, `continuation`, or legacy transport mode;
- entry plan and manifest checksums;
- normalized Provider input/output/cache/total/cost values;
- estimated final-Prompt and memory-transport tokens;
- observation time, body-free marker, measurement scope, and SHA-256 checksum.

`verifyTaskAgentMemoryTransportUsageReceipt()` validates schema, exact identities, transport, numeric bounds, cache ratio, total accounting, time, body-free policy, and checksum.

The receipt status is one of:

- `reported`: Provider emitted usable token or cost data;
- `unreported`: execution returned without Provider usage fields;
- `failed`: execution failed, whether or not partial usage was observed.

An unreported call is not treated as a reported zero-token call.

## Measurement scope

Provider usage is the real usage of the whole Provider call bound to a memory transport. It is not claimed to be a perfect causal decomposition of memory text alone.

The receipt separately records a body-free estimate of the injected memory transport. Repeated observations can therefore compare full, delta, and continuation under the same Provider/model/runtime conditions without pretending that all whole-call token differences came only from memory.

## Production wiring

Usage now flows through:

- direct CLI normalization and completion callback;
- external Agent Runner result and callback;
- durable direct-dispatch spool result;
- group mention and retry delivery;
- direct task-queue delivery;
- automatic assignment delivery;
- dispatch-WAL delivery recovery.

The usage receipt is embedded in the existing checksum-sealed memory delivery receipt. It inherits snapshot retention and exact `tas_*` lifecycle without introducing another sidecar ledger.

## Inventory and Memory Center

Inventory aggregates only verifier-valid usage receipts and exposes:

- receipt, valid, invalid, reported, unreported, and failed counts;
- Provider input/output/cache creation/cache read/accounted totals;
- full, delta, and continuation call counts;
- per-mode Provider input, cache-read, and memory-transport estimates;
- distinct Provider and model counts;
- per-row usage status, checksum, mode, Provider/model, and token details.

Fleet and selected-group Memory Center cards show Provider usage coverage, token/cache totals, and mode comparisons. Group filtering remains exact; a sibling group's unreported state or token totals do not appear in the selected group.

## Verification

New command:

```text
npm run test:task-agent-memory-transport-provider-usage-restart
```

The restart harness covers:

- Claude, Codex, and Cursor structured usage shapes;
- included-cache versus separate-cache accounting;
- exact `tas_*` full, delta, and continuation deliveries;
- three checksum-sealed reported usage receipts;
- zero repeated memory body estimate for continuation;
- an explicit unreported sibling-group receipt;
- direct spool usage persistence;
- restart aggregation by mode;
- exact-group and fleet totals;
- Memory Center projection and sibling isolation;
- token tamper rejection and body-free receipts;
- production source wiring for mention/retry, direct, automatic, CLI, and external runner paths.

Result: `58/58`.

Deterministic exact-group aggregate:

```text
full input: 1000
delta input: 600
continuation input: 250
total input: 1850
cache read: 1400
accounted total with output: 2040
```

These fixture differences validate accounting and grouping, not real-world savings claims.

## Regression summary

Focused Phase 379 run:

- Provider memory transport usage: `58/58`;
- Phase 376 memory entry delta sync: `47/47`;
- Phase 377 render lease/crash takeover: `38/38`;
- Phase 378 contention retry: `41/41`;
- Provider memory-channel acknowledgement: `38/38`;
- direct durable dispatch spool: `39/39`;
- existing compaction Provider usage accounting: `23/23`.

Focused total: `284/284`.

Targeted memory checks through Phase 379: `1140/1140`.

Full frontend, MCP, and backend builds pass. Backend and MCP TypeScript checks pass.

## Production state

No real Provider model call, account authorization, memory deletion, or production baseline mutation occurred in this phase. The fixtures use authentic supported output shapes with deterministic local data.

The running CCM process must restart before loading the new runtime, delivery, inventory, and frontend bundles.

## Remaining parity work

- run account-authorized long-duration full/delta/continuation measurements across real Claude Code, Codex, and Cursor sessions;
- stratify real observations by Provider version, model, Prompt-cache state, task family, and comparable final-Prompt size;
- use measured distributions rather than one-off calls before tuning delta thresholds or retry timing;
- continue auditing future Claude Code Team Memory, compact, and usage-accounting behavior.

The long-term Claude Code parity goal remains active.
