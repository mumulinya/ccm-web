# Phase 18 - Global User/Managed Claude Memory Import

## Goal

Bring CCM closer to Claude Code's memory loading order by importing user and managed Claude memory files into group typed `MEMORY.md`, so fresh third-party project child Agents can receive both group memory and durable global instructions in one bounded packet.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\utils\config.ts`
  - `D:\claude-code\src\utils\envUtils.ts`
- Claude Code loads:
  - Managed memory from managed settings path: `CLAUDE.md` and `.claude/rules/*.md`;
  - User memory from `CLAUDE_CONFIG_DIR` or `~/.claude`: `CLAUDE.md` and `rules/*.md`;
  - Project memory after that, with later/higher-priority memory receiving stronger attention.

## Implementation

- Added `discoverGlobalClaudeMemoryFiles(options)` in `backend/modules/collaboration/group-memory-index.ts`.
- Added `importGlobalClaudeMemoryToGroupTypedMemory(groupId, options)`.
- User Claude memory imports as typed `user` memory, giving it high priority in CCM's typed load plan.
- Managed Claude memory imports as typed `reference` memory, so user-level instructions can still override it later.
- `paths` frontmatter is preserved, so user/managed rules participate in Phase 16 path-conditional recall.
- `buildAgentMemoryContextBundle()` now imports global Claude memory before building typed index, load plan, recall, and source manifest.
- `buildGlobalGroupMemoryContext()` imports global Claude memory for selected groups before rendering multi-group context.

## Selftests

- Added `runGroupGlobalClaudeMemoryImportSelfTest()`.
- Added `runGroupGlobalClaudeMemoryImportContextSelfTest()`.

## Operational Memory

- Default user root follows Claude Code: `CLAUDE_CONFIG_DIR` or `~/.claude`.
- Default managed root follows platform convention or can be overridden with `CCM_MANAGED_CLAUDE_MEMORY_DIR` / `CLAUDE_CODE_MANAGED_SETTINGS_PATH`.
- Empty global roots are quiet by default; configured missing roots are reported as issues.
- Imported global docs become normal typed memory docs, so recall ledger, load plan, source manifest, and path conditions all apply.

## Still Open

- External include approval semantics are still not implemented.
- Full Claude settings-source enable/disable policy is not mirrored yet.
- TeamMem/AutoMem equivalents are still future work.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupGlobalClaudeMemoryImportSelfTest()` and `runGroupGlobalClaudeMemoryImportContextSelfTest()`

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
