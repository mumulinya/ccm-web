# Phase 382: Live Provider memory usage authorization

Date: 2026-07-17

## Goal

Turn Phase 381's live usage baseline gate into a production-safe authorization boundary for real full, delta, and continuation measurements. A benchmark must not inherit permission from ordinary task traffic, a stale approval, a fixture, or a UI refresh. It must receive one explicit, bounded, revocable, single-use authorization tied to the exact endurance and Provider runtime evidence.

## Bounded plan

The default authorization preview binds this complete plan:

```text
2 exact group sessions
3 samples per mode
full + delta + continuation
18 Provider calls
$0.20 maximum per call
$3.60 maximum total cost
concurrency 1
```

The preview is advisory. It always reports `liveExecutionAuthorized=false` and `receiptCreated=false`.

Changing the Provider, model, runtime identity, endurance report, group count, sample count, timeout, or cost cap changes the plan checksum and invalidates approval for the old plan.

## Authorization receipt

`ccm-live-provider-memory-usage-authorization-v1` is stored under CCM's reliability directory and sealed with both a canonical SHA-256 checksum and a durable local HMAC secret.

Creation requires all of the following:

- checksum-valid, account-backed endurance evidence;
- at least two isolated waves and two passed groups;
- latest Provider transition gate passed;
- current Provider semantic version and executable identity matching endurance;
- valid bounded plan;
- exact plan and endurance checksums supplied by the caller;
- explicit approval, risk acceptance, and cost acknowledgement;
- a non-empty approving actor.

Only one active receipt may exist for the same plan. Approval expires, is single-use, and does not execute a Provider call.

## Lifecycle

The durable state machine is:

```text
approved -> claimed -> completed
                    -> execution_failed
approved -> revoked
approved -> expired
claimed  -> interrupted
tampered -> invalid inventory row
```

Claim requires `explicitExecution=true` and immediately consumes the receipt before any Provider work begins. Completion checks observed call count, observed cost, exact baseline count, publishable baseline proofs, endurance identity, Provider identity, and the claimed authorization checksum.

Every exact-session baseline must contain exactly one authorization checksum and it must equal the claimed receipt checksum. A completed, failed, revoked, expired, interrupted, or tampered receipt cannot be replayed.

Restart reconciliation expires old approvals and seals stale claimed work as `interrupted`; it never returns a consumed credential to the approved state.

## Runner and baseline binding

The native runner accepts account-backed live usage provenance only when the supplied authorization is approved and has a valid checksum shape. Usage receipts carry that authorization checksum through Provider usage normalization and task-Agent delivery persistence.

Phase 381's baseline gate now exposes `authorizationChecksums`. Phase 382 completion rejects baselines that are not exact `group + gcs_*`, are not publishable, reference another endurance report or Provider, or do not bind the currently claimed receipt.

## Memory Center

Memory Center provides a dedicated API:

```text
GET  /api/memory-center/live-usage-authorization
POST /api/memory-center/live-usage-authorization
```

GET returns all Claude Code, Codex, and Cursor previews plus the durable inventory. POST supports explicit approve and revoke operations.

The task-Agent memory panel now:

- selects the requested Provider without mixing inventories;
- refreshes the dedicated authorization API instead of relying only on overview cache;
- displays Provider, model, runtime, group count, samples, modes, total calls, concurrency, per-call cap, and total cost cap;
- displays approved, claimed, completed, failed, revoked, and invalid counts;
- explains endurance readiness, runtime matching, and gate state;
- disables Provider switching while an authorization is active;
- requires separate risk and maximum-cost checkboxes in the approval modal;
- allows an unused authorization to be revoked;
- states that authorization never starts execution.

There is intentionally no benchmark execution button. Authorization and execution remain separate security boundaries.

## Verification

Phase 382 command:

```text
npm run test:task-agent-live-memory-usage-authorization-restart
```

The two-process harness covers HMAC verification, deterministic cost planning, explicit approval policy, incorrect plan rejection, duplicate rejection, claim-before-call semantics, two exact-session baselines, authorization checksum back-binding, call and cost overruns, revocation, replay rejection, tamper detection, runtime drift, crash recovery, Memory Center API behavior, frontend provider selection, cost disclosure, explicit acknowledgement, and absence of an execution control.

Result after Phase 383's concurrent-claim regression was added: `50/50`.

Compatibility regression:

- Phase 381 live usage baseline: `48/48`;
- live Provider endurance: `45/45`;
- live wave approval: `55/55`;
- Provider version-transition canary: `71/71`;
- initial Provider baseline canary: `96/96`.

Phase 376-382 focused memory chain: `430/430`.

Targeted memory checks through Phase 382: `1286/1286`.

Full frontend, MCP, and backend builds pass. Backend and MCP no-emit type checks, split exports, and factory dependency checks pass.

## Production state

No real Claude Code, Codex, or Cursor model call was executed in Phase 382. The authorization tests use isolated fake runtime binaries and deterministic usage fixtures while exercising real CCM checksums, HMAC, files, restart reconciliation, API routes, reports, and UI bindings.

Current read-only Codex preview:

```text
Provider: codex
Model: gpt-5.4-mini
Runtime: 0.115.0
Endurance ready: true
Runtime identity matches endurance: false
Approvable: false
Current identity: 1c664e8ec52a2f9974ad0d24e154d6c844d48cf1ee3edf7a4881e3f644d17210
Endurance identity: 5adc0fe84a7072d248b6fe02337e773bd2b9330584a1e450bdbdc523aef065ff
```

The drift is not bypassed. A version-transition canary and endurance reproof for the current binary identity are required before the UI can create a real usage authorization. Only after that proof may a separately invoked benchmark claim the one-time receipt and make account-backed calls within the sealed plan and cost limits.

The long-term Claude Code parity goal remains active.
