# Phase 24 - Memory Source Change Reload Trigger

## Goal

Make CCM reload group memory context when the underlying memory source manifest changes, so child Agent sessions and global Agent loops do not keep reusing stale context after typed memory, imported Claude memory, compacted summaries, hooks, or setting-source-shaped inputs change.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\utils\hooks.ts`
  - `D:\claude-code\src\services\compact\postCompactCleanup.ts`
  - `D:\claude-code\src\commands\clear\caches.ts`
- Claude Code behavior mirrored:
  - Instruction memory is reload-sensitive to the current file/source shape.
  - Cache cleanup and post-compact cleanup should not hide changed memory inputs.
  - Hook/audit evidence should explain when loaded instructions were refreshed.
  - Context consumers need a reasoned reload path, not only a blind cache hit.

## Implementation

- Added `GROUP_MEMORY_SOURCE_CHANGE_TRIGGER_VERSION`.
- Added source snapshot helpers:
  - `buildSourceManifestSnapshot(sourceManifest)`
  - `diffSourceManifestSnapshots(previousEntries, currentEntries)`
- Extended `recordGroupMemoryReloadAudit()` so each per-scope ledger row stores normalized `sourceEntries`.
- Added source diffing against the previous scope snapshot.
- Added automatic reason promotion:
  - ordinary `context_bundle`
  - `global_context_bundle`
  - `source_cache_checked`
  - become `memory_source_changed` when the source manifest, source shape, or source entry fingerprint changes.
- Added `sourceChangeTrigger` evidence to reload audit output and per-scope ledger state:
  - `triggered`
  - `reason`
  - `originalReason`
  - `addedCount`
  - `removedCount`
  - `changedCount`
  - `changedIds`
- Added `memory_source_changed` to forced reload reasons.
- Child Agent rendered context now shows:
  - `记忆源变更触发 reload`
  - changed/added/removed counts
  - changed source ids
- Global Agent rendered context now shows:
  - `memory source change trigger`
  - changed/added/removed counts
- Updated reload-audit selftest expectations so the second changed source bundle is expected to promote from `context_bundle` to `memory_source_changed`.

## Selftests

- Added `runGroupMemorySourceChangeReloadSelfTest()`.
- The selftest verifies:
  - the first audit establishes a non-triggered source baseline;
  - a later source fingerprint change automatically promotes the reload reason to `memory_source_changed`;
  - the trigger records changed counts and changed ids;
  - a stable follow-up source snapshot returns to ordinary `context_bundle`;
  - the ledger stores `memory_source_changed` evidence;
  - rendered child context exposes the promoted reason.
- Updated `runGroupMemoryReloadAuditSelfTest()` to verify the promoted reason and rendered context.

## Operational Memory

- `memory_source_changed` is now the durable signal that a child Agent or global Agent received a fresh context bundle because memory inputs changed.
- This is important for CCM's per-task child Agent sessions: every new third-party Agent execution can now receive group memory as context without accidentally reusing a stale bundle after memory imports, compaction outputs, or typed-memory indexes shift.
- The trigger is scoped by reload audit scope, so multiple group chats can keep independent source baselines.
- Stable snapshots still allow cache reuse. The change only forces reload when the normalized source manifest differs from the previous scope snapshot.
- This phase strengthens Phase 19 reload audit, Phase 20 include import, Phase 22 setting-source policy, and Phase 23 `InstructionsLoaded` hook observability by tying their source evidence into the context reload decision.

## Still Open

- File-system watcher driven reload is not implemented yet; this phase reacts when CCM builds/evaluates context and compares source snapshots.
- There is not yet a UI panel that shows source diffs from the reload ledger.
- Source snapshots currently compare normalized manifest entries; deeper content-level invalidation can still be expanded for larger imported memory trees.
- The next Claude Code parity direction should focus on lazy memory discovery and cache invalidation boundaries around actual child Agent dispatch.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - `runGroupMemorySourceChangeReloadSelfTest()`
  - updated `runGroupMemoryReloadAuditSelfTest()`
  - full dist memory regression including `sourceChangeReload`

Dist regression result after backend build:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
  "globalClaudeImport": true,
  "globalClaudeImportContext": true,
  "externalApproval": true,
  "settingSource": true,
  "instructionsHook": true,
  "sourceChangeReload": true,
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
