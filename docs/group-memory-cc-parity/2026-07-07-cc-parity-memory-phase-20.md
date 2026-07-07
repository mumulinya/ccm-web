# Phase 20 - Claude Memory Include Import Audit

## Goal

Bring CCM closer to Claude Code's `CLAUDE.md` include behavior by expanding and auditing `@include` references during project, user, and managed Claude memory import, so fresh third-party child Agent sessions receive the included memory as typed context instead of silently losing it.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
- Claude Code behavior mirrored:
  - Extracts `@path` include references from memory files.
  - Resolves `@./relative`, `@~/home`, and absolute includes.
  - Skips includes inside code spans/fences and HTML comment-only lines.
  - Limits include depth.
  - Skips non-text includes.
  - Skips unapproved external project/managed includes.
  - Allows user memory to include external files.
  - Tracks parent/include relationship for observability.

## Implementation

- Added `ccm-claude-memory-include-audit-v1`.
- Added shared Claude memory include expansion for:
  - project `CLAUDE.md`
  - project `.claude/CLAUDE.md`
  - project `.claude/rules/*.md`
  - project `CLAUDE.local.md`
  - user `~/.claude/CLAUDE.md`
  - user `~/.claude/rules/*.md`
  - managed `CLAUDE.md`
  - managed `.claude/rules/*.md`
- Imported approved include files as typed `MEMORY.md` docs.
- Added include audit data to project and global Claude import results:
  - `includedCount`
  - `importedIncludeCount`
  - `skippedCount`
  - `graph`
  - `issues`
- Neutralized original source `@include` markers inside imported typed docs after expansion, so typed load planning does not accidentally resolve source-project paths relative to CCM's group memory directory.
- Child Agent and global Agent rendered context now mention include import/skip counts.

## Selftests

- Extended `runGroupProjectMemoryImportSelfTest()`:
  - Imports a real project include file.
  - Verifies the include sentinel is recallable from typed memory.
  - Verifies an HTML-comment include is not imported.
  - Verifies a missing include is audited.
- Extended `runGroupGlobalClaudeMemoryImportSelfTest()`:
  - Imports a user external include.
  - Verifies the user include sentinel is recallable.
  - Verifies an unapproved managed external include is skipped and audited.

## Operational Memory

- Project and managed external includes are skipped unless explicitly allowed through import options.
- User external includes are allowed by default, matching Claude Code's user-memory behavior.
- Include expansion is bounded by the typed memory include depth cap.
- The source manifest sees imported include docs as normal typed memory documents, so child Agent context, global Agent context, reload audit, load planning, and recall all work on the expanded source set.

## Still Open

- CCM still does not implement Claude Code's interactive external include approval prompt.
- Include extraction is line/token-like and conservative, but not a full Markdown lexer clone.
- First-class `InstructionsLoaded` hook execution remains future work; Phase 19 currently records hook-style audit events.
- Setting-source enable/disable parity is still incomplete.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - full dist memory regression including the updated project/global Claude import selftests

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
