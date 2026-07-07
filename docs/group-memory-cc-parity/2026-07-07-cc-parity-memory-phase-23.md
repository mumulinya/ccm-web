# Phase 23 - InstructionsLoaded Hook Pipeline

## Goal

Upgrade CCM from hook-style reload audit records to a real `InstructionsLoaded` hook pipeline, matching Claude Code's behavior where instruction memory files emit non-blocking observability events when loaded into context.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\hooks.ts`
  - `D:\claude-code\src\utils\claudemd.ts`
- Claude Code behavior mirrored:
  - `hasInstructionsLoadedHook()` checks whether hooks are configured.
  - `executeInstructionsLoadedHooks()` emits `hook_event_name: "InstructionsLoaded"`.
  - Hook input includes `file_path`, `memory_type`, `load_reason`, `globs`, and `parent_file_path`.
  - Include files use `load_reason: "include"`.
  - The hook is observability/audit only and should not block context loading.

## Implementation

- Added `ccm-claude-instructions-loaded-hook-event-v1`.
- Added `ccm-claude-instructions-loaded-hook-execution-v1`.
- Added per-group hook ledger:
  - `.instructions-loaded-hooks.json`
  - stored under the group's typed `MEMORY.md` directory.
- Added exported APIs:
  - `getGroupClaudeInstructionsLoadedHookLedgerFile(groupId)`
  - `registerGroupMemoryInstructionsLoadedHook(hook)`
  - `hasGroupMemoryInstructionsLoadedHook()`
  - `loadGroupClaudeInstructionsLoadedHookLedger(groupId)`
  - `executeGroupMemoryInstructionsLoadedHooks(groupId, input)`
- Project Claude memory imports now fire hooks for:
  - project `CLAUDE.md`
  - `.claude/CLAUDE.md`
  - `.claude/rules/*.md`
  - `CLAUDE.local.md`
  - approved/imported include files
- Global Claude memory imports now fire hooks for:
  - user `CLAUDE.md`
  - user `rules/*.md`
  - managed `CLAUDE.md`
  - managed `.claude/rules/*.md`
  - approved/imported include files
- Hook failures are recorded in the ledger but do not stop memory import.
- Child Agent and global Agent rendered context now mention hook event/fired/failure counts and ledger paths.

## Selftests

- Added `runGroupInstructionsLoadedHookPipelineSelfTest()`.
- The selftest verifies:
  - hooks can be registered and unregistered;
  - a top-level project memory file fires with `load_reason: "session_start"`;
  - an included file fires with `load_reason: "include"` and a parent path;
  - a failing hook records errors but does not block import;
  - the ledger persists per-file hook execution rows;
  - typed recall can still find imported include memory after hook failure.

## Operational Memory

- This phase gives CCM a real hook surface for memory observability. Future integrations can register a hook to audit which memory files were injected before a child Agent task starts.
- The pipeline is synchronous inside CCM's current import path. If a hook returns a Promise, it is recorded as `async_not_awaited` rather than blocking the import.
- Hooks are process-local registrations; durable evidence is the per-group ledger.
- Phase 19 reload audits still decide why a context build should reload. Phase 23 records which instruction files actually emitted hook events during import.

## Still Open

- There is not yet a UI/API route for managing hook registrations.
- Hook execution is synchronous and local; there is no external command runner or timeout wrapper yet.
- Lazy file-triggered nested memory hooks remain future work.
- Full Claude Code hook config parsing is not implemented.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - `runGroupInstructionsLoadedHookPipelineSelfTest()`
  - full dist memory regression including `instructionsHook`

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
  "externalApproval": true,
  "settingSource": true,
  "instructionsHook": true,
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
