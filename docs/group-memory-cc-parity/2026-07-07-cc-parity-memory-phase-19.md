# Phase 19 - Reload Reason and Cache Audit Ledger

## Goal

Move CCM closer to Claude Code's memory reload behavior by recording why group memory was loaded or reloaded, whether the source set changed, and which cache-like action should be taken before a fresh child Agent or global Agent context is used.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\services\compact\postCompactCleanup.ts`
- Claude Code keeps a one-shot `nextEagerLoadReason`, clears the `getMemoryFiles()` memoize cache when memory must be reloaded, and reports the next eager load through the `InstructionsLoaded` hook.
- After compaction, Claude Code clears user context and memory-file caches, then arms a `compact` reload reason so the next memory load is observable.

## Implementation

- Added a persistent per-group reload ledger under CCM's `group-memory-reload` runtime directory.
- Added `ccm-group-memory-reload-audit-v1` records with:
  - `reason`
  - `scope`
  - `contextKind`
  - source manifest checksum
  - stable source shape fingerprint
  - typed load plan fingerprint
  - `shouldReload`
  - cache action and hook-style event name
- Child Agent memory bundles now include `memory_reload_audit` and expose the reload ledger path in `raw_sources`.
- Global Agent multi-group memory bundles now include per-group reload audit data and expose each ledger path.
- Rendered child context now prints `记忆 reload 审计`.
- Rendered global context now prints `memory reload audit`.
- Reload reasons are derived from explicit options, memory imports, post-compact recovery state, or normal context bundle generation.

## Selftests

- Added `runGroupMemoryReloadAuditSelfTest()`.
- Extended typed child context and global multi-group context regression checks so rendered context must mention reload audit metadata.
- Added reload ledger cleanup to memory context selftests.

## Operational Memory

- First context build for a scope records `shouldReload: true`.
- Repeat context build for the same scope can reuse source state when source manifest and load plan fingerprints are unchanged.
- Forced reload reasons include:
  - `compact`
  - `post_compact_restore`
  - `project_memory_import`
  - `global_claude_memory_import`
  - `memory_file_import`
  - `manual`
  - `session_start`
- The ledger keeps the last 120 audit entries and the latest audit state per scope.

## Still Open

- CCM now records hook-style events, but it does not yet execute a first-class `InstructionsLoaded` hook pipeline.
- There is no filesystem watcher that automatically arms reload reasons when memory files change outside a context build.
- External include approval and warning semantics are still future work.
- Full Claude settings-source enable/disable policy is still not mirrored.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - full dist memory regression including `runGroupMemoryReloadAuditSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "reloadAudit": true,
  "distill": true,
  "distillQuality": true,
  "sourceManifest": true,
  "context": true,
  "globalContext": true,
  "warning": true,
  "preserved": true,
  "audit": true,
  "timeBased": true,
  "partial": true,
  "sidecar": true,
  "ptl": true,
  "recovery": true,
  "micro": true,
  "hook": true,
  "quality": true,
  "integration": true,
  "auto": true
}
```
