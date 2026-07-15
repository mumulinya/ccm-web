# Phase 304: Worker Compact Session Strategy Isolation

Date: 2026-07-15

## Goal

Prevent one conversation from tuning another conversation's child-Agent compact behavior. WorkerContextPacket compact hooks, outcomes, learned strategy and PTL emergency hints must use the exact `groupId + gcs_*` scope, remain body-free, survive concurrent processes without lost updates, and disappear when that group-chat session is deleted.

## Gap

CCM already propagated `group_session_id` into child-Agent assignments and WorkerContextPackets, but four derived ledgers still used only `<groupId>.json`:

- compact pre/post hooks;
- compact retry outcomes;
- learned metadata compact strategy;
- repeated-failure PTL emergency hints.

That allowed repeated pressure in session A to influence the retry options used by session B. It also made concurrent Node processes vulnerable to read-modify-write loss.

## Changes

### Exact-session persistence

`backend/modules/collaboration/group-orchestrator.ts` now stores exact-session artifacts under:

`<artifact-root>/<groupId>/<gcs_*.json>`

Legacy calls without a `gcs_*` keep using `<artifact-root>/<groupId>.json` for compatibility. Exact-session reads never fall back to that legacy aggregate.

Every new entry and ledger binds:

- `groupId` / `group_id`;
- `groupSessionId` / `group_session_id`;
- exact `scopeId`.

Cross-group and cross-session entries are rejected during retention. Strategy and PTL files also verify their internal session binding, so copying another session's file into the current path cannot activate foreign policy.

### Concurrent durability

Hook and outcome appends now use the shared exclusive file lock and durable atomic JSON writer. Outcome append, strategy regeneration and PTL regeneration are serialized under the same outcome lock, preventing a slower process from overwriting a newer learned policy.

Atomic writes provide fsync-backed replacement and valid-primary backups. Readers can recover a valid backup while reporting `recoveredFromBackup` to diagnostics.

### Production retry chain

`maybeRetryWorkerContextPacketCompactionForCoordinator()` derives the exact session from the assignment, packet or options and uses it for:

- strategy lookup;
- PTL hint lookup;
- pre/post hook writes;
- outcome writes;
- deterministic hook identity.

One session's blocked outcomes can therefore engage PTL only for that session.

### Lifecycle and observability

- `deleteGroupSessionMemoryArtifacts()` deletes all four Worker compact artifact families and backups.
- Memory Center diagnostics expose exact-session hook/outcome counts, learned strategy samples, preferred categories, PTL state and backup recovery.
- The frontend adds a `Worker 压缩会话策略` panel beside the reactive compact ownership panel.

## Verification

New test:

`npm run test:worker-context-compact-session-strategy-isolation`

Result: 14/14 checks passed.

Evidence:

- session A: 5 outcomes, 10 hooks, 4 strategy samples, critical PTL;
- session B: 0 outcomes, 0 strategy samples, PTL clear;
- legacy unscoped ledger: 1 outcome in a separate file;
- two real concurrent Node processes added two outcomes and four hooks without loss;
- every exact outcome and hook carried the expected `gcs_*`;
- persisted files did not contain the private task-body sentinel;
- session deletion removed eight primary/backup artifacts without touching the sibling session.

Regression checks passed:

- Phase 300 Provider generation restart reconciliation;
- Phase 302 auto-compact circuit breaker restart;
- Phase 303 reactive compact retry ownership;
- group memory auto-compaction session scope;
- compaction-hook session isolation;
- task-Agent compact-head fence;
- global-Agent global-only context.

Full `npm run build` passed for frontend, MCP Feishu integration and backend.

## Production Verification

- URL: `http://localhost:3081`
- PID: `35748`
- command: `D:/nodejs/node.exe ccm-package/dist/server.js 3081`
- home: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200, 189040 bytes
- stderr: 0 bytes
- log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase304.log`
- error log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase304.err.log`

Visual verification:

- desktop 1280 x 720 rendered with document and body width exactly 1280 and no horizontal overflow;
- mobile 390 x 844 rendered with document and body width exactly 390;
- no visible button exceeded the mobile viewport by more than one pixel (the `更多` button had a 0.4 px fractional layout edge only);
- browser console errors/warnings: 0;
- desktop and mobile screenshots were captured successfully.

## Remaining Direction

The long-term goal remains active. The next audit should compare remaining group-wide child-Agent feedback/distillation artifacts against the exact-session boundary and close any policy path that can still consume another `gcs_*` without an explicit cross-session aggregation contract.
