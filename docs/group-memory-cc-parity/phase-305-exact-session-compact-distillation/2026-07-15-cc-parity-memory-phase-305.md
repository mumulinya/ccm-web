# Phase 305: Exact-Session Compact Distillation

Date: 2026-07-15

## Goal

Carry Phase 304 exact-session Worker compact outcomes through the complete learning chain. Retention checks, strategy quality, PTL quality and typed MEMORY.md distillation must discover nested `groupId/gcs_*.json` ledgers, preserve session provenance and write only into the matching `groupId--gcs_*` typed-memory scope.

## Claude Code Reference

The audit followed the same ownership boundary emphasized by Claude Code:

- `D:/claude-code/src/services/compact/postCompactCleanup.ts` keeps main-thread and subagent compact cleanup separate so one source cannot reset another source's state.
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts` binds session-memory compaction and post-compact reconstruction to the active session boundary.
- `D:/claude-code/src/services/compact/prompt.ts` keeps compact summaries useful while retaining a transcript reference for exact historical detail.

CCM had already isolated production Worker hook/outcome/strategy/PTL files in Phase 304. The remaining Memory Center quality and distillation consumers still scanned only top-level `<groupId>.json` files and wrote typed memory to the bare group scope.

## Changes

### Exact-session scope inventory

`backend/modules/knowledge/memory-control-center.ts` now discovers both:

- legacy top-level `<groupId>.json` ledgers;
- exact nested `<groupId>/<gcs_*.json>` ledgers.

Each inventory row carries `groupId`, `groupSessionId`, diagnostic `scopeId`, typed `groupId--gcs_*` scope, source file and legacy status. Explicit `groupSessionIds` select exact sessions without silently adding the legacy aggregate.

### Read and quality chain

Exact-session readers delegate to the production coordinator readers, preserving their strict session filter and backup behavior. The following reports now operate per exact scope:

- compact outcome retention safety;
- compact strategy memory quality;
- compact strategy typed-memory quality;
- PTL emergency downgrade quality;
- PTL emergency typed-memory quality.

Reports may aggregate counts for observability, but aggregate rows never become runtime strategy input.

### Typed MEMORY.md isolation

Compact strategy and PTL distillation now target `groupId--gcs_*`, not the bare group id. Generated archives, outcome rows and Markdown documents carry exact `groupSessionId` provenance.

Distilled row identities include the session id, preventing identical provider outcome ids from colliding across sibling conversations. Group-level typed memory remains untouched unless a legacy unscoped ledger is explicitly processed.

### Lifecycle

The existing exact-session deletion path already removes `groupId--gcs_*` typed-memory directories. Phase 305 verifies that deleting session A removes its strategy/PTL documents while session B remains intact.

## Verification

New test:

`npm run test:worker-context-compact-exact-session-distillation`

Result: 16/16 checks passed.

Coverage includes:

- real WorkerContextPacket pressure outcomes in two `gcs_*` sessions;
- nested-ledger discovery with no legacy aggregate fallback;
- exact-session retention safety and zero cross-session rejection;
- strategy and PTL quality reports over both sessions;
- typed-memory writes under separate `groupId--gcs_*` directories;
- bare group typed memory remaining untouched;
- session-bound compact/PTL archive rows and collision-resistant row ids;
- exact-session provenance in generated Markdown;
- private task body sentinel absent from typed memory;
- quality/distillation replay across a second Node process remaining idempotent;
- deleting session A removing its typed memory and preserving session B.

Regression checks passed:

- legacy compact strategy/PTL quality and typed-memory self-tests;
- Phase 300 Provider generation restart reconciliation;
- Phase 302 auto-compact circuit breaker restart;
- Phase 303 reactive compact retry ownership;
- Phase 304 Worker compact session strategy isolation;
- group typed-memory distillation preflight;
- group auto-compaction session scope;
- global-Agent global-only context.

Full `npm run build` passed for frontend, MCP Feishu integration and backend.

## Production Verification

- URL: `http://localhost:3081`
- PID: `31336`
- command: `D:/nodejs/node.exe ccm-package/dist/server.js 3081`
- home: three consecutive HTTP 200 responses
- Memory Center overview: HTTP 200, 189040 bytes
- Memory Center quality API: HTTP 200, 644608 bytes
- all five affected quality checks are present and currently `ok`
- stderr: 0 bytes
- log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase305.log`
- error log: `C:/Users/admin/.cc-connect/logs/ccm-server-phase305.err.log`

## Remaining Direction

The long-term goal remains active. The next audit should inspect other child-Agent feedback and provider reliability distillation paths for the same pattern: exact-session operational evidence must not be promoted into group-wide runtime policy without an explicit, provenance-preserving cross-session promotion contract.
