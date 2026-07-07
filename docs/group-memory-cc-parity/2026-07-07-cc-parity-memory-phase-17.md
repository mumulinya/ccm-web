# Phase 17 - Project Claude Memory Import

## Goal

Bring CCM closer to Claude Code's project memory discovery by importing project-level Claude memory files into group typed `MEMORY.md`. This makes project instructions and `.claude/rules/*.md` available to fresh third-party child-agent sessions through the same group memory packet as compressed chat memory.

## Claude Code Reference

- Reference checked: `D:\claude-code\src\utils\claudemd.ts`.
- Claude Code discovers:
  - `CLAUDE.md`;
  - `.claude/CLAUDE.md`;
  - `.claude/rules/*.md`;
  - `CLAUDE.local.md`.
- It loads project files as concrete memory sources and applies path-conditional rules through frontmatter `paths`.

## Implementation

- Added `discoverProjectMemoryFiles(projectRoot, options)` in `backend/modules/collaboration/group-memory-index.ts`.
- Added `importProjectMemoryFilesToGroupTypedMemory(groupId, projectRoot, options)`.
- Imported project memory files become typed memory docs with deterministic slugs and `source: project-memory:<project>:<kind>:<relPath>`.
- Preserves frontmatter `paths`, so imported `.claude/rules/*.md` participate in Phase 16 path-conditional recall and load-plan filtering.
- `buildAgentMemoryContextBundle()` now:
  - resolves project root from explicit `projectRoot/project_root/workDir/work_dir`;
  - falls back to `getWorkDirForProject(targetProject)`;
  - imports project Claude memory before building typed index, load plan, recall, and source manifest.
- `buildGlobalGroupMemoryContext()` now imports project Claude memories for selected group members when their project roots are known.

## Selftests

- Added `runGroupProjectMemoryImportSelfTest()`.
- Added `runGroupProjectMemoryImportContextSelfTest()`.

## Operational Memory

- Use this for project instructions that should survive third-party child-agent session resets.
- Project memory import feeds typed `MEMORY.md`; child Agents still receive a bounded rendered packet, not raw unlimited project docs.
- Imported `.claude/rules/*.md` with `paths` only appear for matching target files.

## Still Open

- Managed/user/global Claude memory import is not implemented yet.
- External include approval semantics are not implemented; imported docs are project-root based and typed-memory include expansion remains restricted to the group typed memory directory.
- Parent-directory walking is available through `maxParentDepth`, but defaults to the explicit project root to avoid surprising imports.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupProjectMemoryImportSelfTest()` and `runGroupProjectMemoryImportContextSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
  "projectImport": true,
  "projectImportContext": true,
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
