# Phase 385: Memory Center custom live cost plans

Date: 2026-07-17

## Goal

Let the user choose the maximum cost per real Provider call in Memory Center while preserving the signed-plan security model from Phases 382-384.

The required flow is:

```text
user enters per-call cost
-> backend rebuilds a preview-only plan
-> backend returns the new plan checksum and total cost
-> user confirms risk and dynamic total cost
-> backend creates a one-time credential
```

The frontend never manufactures a plan checksum and approval creation still does not start a Provider call.

## Bounded cost model

Usage Benchmark, ordinary endurance wave, version-transition canary, and initial Provider baseline canary now accept a user-selected maximum cost per call.

The accepted range is `$0.01` through `$5.00`, normalized to cents. Non-numeric, zero, negative, and above-limit values produce an invalid, non-approvable plan instead of being silently clamped into an approvable value.

The backend derives the total from the sealed call count:

```text
maximum total cost = planned Provider calls x maximum cost per call
```

Examples covered by the restart test:

- two-group wave: `4 x $0.35 = $1.40`;
- two-group Usage Benchmark: `18 x $0.33 = $5.94`.

Changing the cost changes the plan checksum. A default `$0.20` checksum cannot approve a `$0.35` or `$0.33` plan.

## Preview-only API

Memory Center supports backend-owned cost previews through:

```text
POST /api/memory-center/live-usage-authorization
{ action: "preview", ... }

POST /api/memory-center/live-endurance-wave-approval
{ action: "preview", approvalMode: "...", ... }
```

Wave approval modes are:

- `endurance_wave`;
- `version_transition_canary`;
- `initial_provider_baseline_canary`.

Preview responses include `receiptCreated=false`, the rebuilt plan, the backend checksum, and a read-only inventory. They do not create a receipt, claim a slot, schedule work, or execute a Provider.

Approval endpoints pass the selected per-call cost back into the same backend builder. The submitted checksum must exactly match that rebuilt plan.

## Claim and restart stability

Current-plan validation now rebuilds wave, canary, and Usage Benchmark plans with the cost sealed in the receipt. A valid custom-cost receipt is therefore not misclassified as stale merely because the system default remains `$0.20`.

The HMAC-sealed receipt persists:

- maximum cost per call;
- planned Provider call count;
- derived maximum total cost;
- exact plan checksum.

The restart harness verifies that both claimed wave and claimed Usage Benchmark receipts retain their custom values across fresh processes.

## Memory Center UX

The approval dialog now provides a numeric maximum-per-call input with:

- minimum `$0.01`;
- maximum `$5.00`;
- `$0.01` step;
- dynamic total cost display;
- invalid-input approval disablement.

Before approval, the UI requests the backend preview and verifies that the returned cost matches the user input. The risk checkbox and dynamic cost checkbox remain separate confirmations. There is still no live execution button in Memory Center.

## CLI

The wave and canary preview/approval CLI accepts:

```text
--max-cost-usd-per-call <amount>
--cost-acknowledged true
```

CLI preview is read-only and returns the same backend-owned plan checksum and total-cost calculation.

## Verification

Phase 385 command:

```text
npm run test:task-agent-live-memory-custom-cost-plan-restart
```

Result: `52/52`.

Compatibility regression:

- Phase 384 wave execution admission: `35/35`;
- ordinary live wave approval: `55/55`;
- version-transition canary: `71/71`;
- initial Provider baseline canary: `96/96`;
- Usage Benchmark authorization: `50/50`;
- Usage Benchmark execution admission: `48/48`.

Compatibility total: `355/355`.

Phase 376-385 focused memory chain: `565/565`.

Targeted memory checks through Phase 385: `1421/1421`.

Engineering verification also passed:

- backend build;
- frontend build;
- full frontend, MCP Feishu, and backend build;
- split-export checks;
- factory dependency checks;
- documentation links: `1071/1071`.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in Phase 385. The tests use a fake local Provider executable and deterministic signed endurance evidence while exercising the production preview, checksum, HMAC receipt, claim, inventory, CLI, UI binding, and restart paths.

The current production Codex runtime still requires a user-approved and cost-acknowledged transition canary before account-backed evidence can advance. Phase 385 lets the user choose that one-time ceiling in Memory Center; it does not approve or execute the canary automatically.

The long-term Claude Code parity goal remains active.
