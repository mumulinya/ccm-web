# Phase 358: Model-side memory context load receipt

Date: 2026-07-16

## Goal

Prove that each production project child Agent did more than receive a correctly constructed Provider command: the third-party model must observe a one-time challenge inside the exact trusted-memory envelope and call a signed CCM MCP tool before the memory delivery can commit.

This closes the gap between server-side transport evidence and model-side context availability while preserving an important distinction:

- `loaded`: the model observed the trusted context and generated the required MCP call;
- `used`, `ignored`, or `verified`: later semantic claims for individual memory documents;
- a load receipt never upgrades memory to semantic `used` by itself.

## Challenge design

CCM creates a unique `ccm-memory-context-consumption-challenge-v1` for every eligible task-agent attempt. The challenge binds:

- group and exact `gcs_*` session;
- task and execution;
- target project;
- `tas_*` task-agent session;
- attempt sequence;
- issue time;
- HMAC signature produced by the existing internal-MCP secret.

The challenge is attached to the memory-context object before the trusted envelope is rendered. Its id and required tool call are therefore inside the same source-checksummed envelope proven by Phases 354–357.

## Model-side tool

`ccm__knowledge_context` now conditionally exposes:

```text
acknowledge_memory_context(challenge_id)
```

The tool is visible only when a signed task context contains a memory challenge and the role is `project-child-agent`. It is not exposed to Global Agent or ordinary calls without a challenge.

The trusted memory section instructs the child Agent to call this tool before work. Repeating the challenge in final text is explicitly insufficient.

## Receipt trust

The MCP process verifies:

1. signed internal task context;
2. signed one-time challenge;
3. group, `gcs_*`, task, project, and `tas_*` bindings;
4. exact challenge id;
5. signed receipt-file path.

It then writes `ccm-memory-context-consumption-receipt-v1` with:

- `state = loaded`;
- `source = provider_model_mcp_call`;
- MCP server/tool identity;
- task/session/attempt bindings;
- HMAC receipt signature.

The external runner and direct runner read and verify that receipt after Provider execution. Missing, forged, cross-session, or mismatched receipts fail closed before a task-agent memory delivery or continuation baseline can commit.

Codex and Cursor launch with isolated `HOME` directories. Internal MCP server configs now carry the absolute central secret-file path in `CCM_INTERNAL_MCP_SECRET_FILE`, so child MCP processes verify the same signer instead of accidentally creating an unrelated secret under the Provider home.

## Production coverage

The challenge and receipt are wired through:

- ordinary group project-child dispatch;
- same-Provider retry and Provider-switch rebind;
- direct group task dispatch;
- auto-assign dispatch;
- external runner fallback;
- durable direct-dispatch spool;
- memory-context snapshot and delivery receipt;
- restart inventory and Memory Center.

Coordinator/global paths do not receive this project-child receipt challenge and remain isolated from group child memory.

Claude runner allowlists explicitly include the challenge tool for required attempts, preventing `--allowed-tools` from blocking the model receipt.

## Semantic lifecycle

Typed-memory consumption analysis now distinguishes:

| State | Meaning |
| --- | --- |
| `delivered_unreported` | Transport succeeded, no model-side load receipt |
| `loaded_unreported` | Model called the signed MCP receipt, but no per-document usage declaration exists |
| `used` / `ignored` / `verified` | Existing structured semantic usage evidence applies |

`loaded_unreported` uses evidence tier `model_mcp_load_receipt`. It carries more confidence than transport-only delivery but does not count as semantic adoption.

## Memory Center

New fleet and group counters:

- `memoryContextConsumptionReceiptRequiredCount`;
- `memoryContextConsumptionReceiptValidCount`;
- `memoryContextConsumptionReceiptMissingCount`.

## Verification

The Phase 358 self-test launches the real bundled `knowledge-context-mcp.js` process and sends JSON-RPC `initialize`, `tools/list`, and `tools/call` messages. It does not call the receipt writer directly.

Coverage includes:

- signed challenge rendering inside the trusted envelope;
- conditional tool discovery;
- real MCP subprocess receipt creation;
- HMAC verification and exact `tas_*` binding;
- final-text-only/missing receipt rejection;
- wrong challenge rejection without receipt creation;
- sibling task-agent session replay rejection;
- durable spool verification;
- restart inventory and Memory Center counts;
- production entry-point enforcement;
- loaded-versus-used semantic separation.

Results:

- Phase 358 model-side receipt restart: `36/36`
- Phase 354 trusted envelope: `31/31`
- Phase 357 Provider acknowledgement: `38/38`
- Native continuation/rebudget: `28/28`
- Direct dispatch spool: `39/39`
- Internal MCP registry: pass, 7 servers / 34 tools
- Internal workflow MCP real-process test: pass

## Remaining parity work

- Add bounded retention and recovery reconciliation for orphaned challenge/receipt files.
- Calibrate retry policy when a Provider completes useful work but omitted the required load call.
- Correlate `loaded_unreported` with later per-document usage and outcome quality without treating correlation as proof.

The long-term Claude Code memory parity goal remains active.
