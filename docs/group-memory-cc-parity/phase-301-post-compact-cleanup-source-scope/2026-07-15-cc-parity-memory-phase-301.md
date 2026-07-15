# Phase 301: Post-Compact Cleanup Source Scope

## Status

- Date: 2026-07-15
- Result: completed
- Scope: source-qualified cleanup, exact group-session binding, cleanup checksum chain, partial-sidecar reset semantics, Memory Center fail-closed visibility
- Long-term goal: remains active

## Claude Code parity source

Claude Code now passes `querySource` into `runPostCompactCleanup()` and treats main-thread and `agent:*` cleanup differently:

- `D:\claude-code\src\services\compact\postCompactCleanup.ts:13-76`
- `D:\claude-code\src\services\compact\autoCompact.ts`
- `D:\claude-code\src\commands\compact\compact.ts`

Subagents share module-level state with the main thread. Their compact cleanup must not reset the main thread's context-collapse state, memory-file cache, or memoized user context. Main-thread compact may reset that state after a successful boundary while preserving invoked-skill continuity.

CCM already stored group-session compact hook ledgers separately, but its cleanup audit contained only `groupId`. The compact transaction receipt stored only `cleanup_audit_passed=true`. A cleanup audit copied from another `gcs_*`, or modified after commit, could therefore still appear compatible with the receipt.

## Implementation

### Cleanup audit v2

`buildGroupPostCompactCleanupAudit()` now emits `ccm-post-compact-cleanup-audit-v2` with:

- exact `groupId + gcs_*` identity and `scopeId`
- explicit `compactSource.kind=group_main_agent`
- a query-source equivalent bound to the exact group session
- an exact cleanup authority contract
- explicit denial of global-Agent and sibling-group-session resets
- a body-free SHA-256 `audit_checksum`

`verifyGroupPostCompactCleanupAudit()` validates schema, source, query source, scope identity, cleanup authority, primary/partial reset semantics, checksum, and expected group/session/boundary identity.

The group main Agent may reset only the selected group session's derived compact state and descendant Provider capacity state. It cannot reset global context or another `gcs_*`. A third-party child Provider compact remains bound to its own `tas_* + nativeSessionId` execution path and cannot masquerade as a group-main compact.

### Partial sidecar semantics

A partial sidecar does not create a primary transcript boundary. Its cleanup audit now records:

- `resetDerivedCompactState=false`
- no exact-group-session reset authority
- no descendant Provider-generation reset authority
- `retain_derived_state_without_primary_boundary`

This prevents a selective sidecar summary from being mistaken for Claude Code-style post-boundary cleanup.

### Receipt and compact-head chain

New compact transaction receipts use `ccm-group-memory-compact-transaction-receipt-v3` and bind `cleanup_audit_checksum`. Receipt verification still reads v1/v2 history but requires the cleanup checksum for v3.

The compact head copies the cleanup checksum from the receipt. Restart recovery verifies the durable cleanup audit against the expected group/session/boundary and verifies that its checksum matches the receipt before the head can be recovered or accepted. A copied audit fails closed even if its own checksum is recomputed, because it cannot rebind the already committed receipt.

### Memory Center

The selected group-session detail verifies cleanup audit v2 against the requested `gcs_*`. It now exposes:

- exact session scope
- compact source kind
- cleanup audit checksum
- global-reset denial
- primary reset or partial-state retention semantics

Cross-session copies, checksum failures, and receipt mismatches appear as fatal cleanup gaps.

## Verification

Phase 301 dedicated selftest: 13/13.

- exact-session cleanup audit verifies
- group-main source and query source are explicit
- global and sibling resets are forbidden
- compact receipt binds cleanup checksum
- compact head carries cleanup checksum
- Memory Center shows exact scope
- core cleanup contract passes
- partial sidecar retains primary derived state
- cross-session audit with recomputed checksum fails restart recovery
- Memory Center fails closed on the copied audit
- tampering does not advance compact head
- untouched sibling has no compact head
- audit, receipt, and head remain body-free

Regression evidence:

- Phase 300 restart reconciliation: 14/14
- Phase 299 generation reset: 12/12
- Phase 295 compact restart soak: 11/11
- Phase 293 resume integration: 12/12
- Phase 292 exact-session hook isolation: 27 checks
- Task-Agent compact-head fence: 38 checks
- Global Agent global-only context: 13/13
- `npm run build:backend`: passed
- `npm run build`: passed

## Production Evidence

- URL: `http://localhost:3081`
- Production PID: `27096`
- Home responses: three consecutive HTTP 200
- Memory Center overview: HTTP 200, 187824-byte response
- stderr size: 0 bytes
- Log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase301.log`
- Error log: `C:\Users\admin\.cc-connect\logs\ccm-server-phase301.err.log`

## Remaining Parity Work

Phase 301 closes cleanup-source confusion and binds cleanup evidence into the durable compact chain. The long-term parity goal remains active; the next source audit should inspect Claude Code's current autocompact failure circuit breaker and decide whether CCM's per-session failure suppression remains restart-safe and strictly isolated.
