# Phase 16 - Path-Conditional Typed Memory

## Goal

Move CCM typed `MEMORY.md` closer to Claude Code `.claude/rules` behavior by supporting path-conditional memories. A project child Agent should receive typed memories that apply to the files in its current task, while unrelated file-specific memories stay out of the packet.

## Claude Code Reference

- Reference checked: `D:\claude-code\src\utils\claudemd.ts`.
- Claude Code reads frontmatter `paths` from rule files and only loads conditional rules when the target path matches.
- It treats match-all rules as normal unconditional memory and filters conditional rules before injecting them into context.

## Implementation

- Extended typed memory frontmatter to preserve `paths`.
- Added target path extraction from task/query text, including common repo paths such as `src/pay.ts`, `src/**/*.ts`, `.vue`, `.json`, `.md`, and Windows-style paths.
- Added bounded glob matching for typed memory path rules:
  - exact path;
  - suffix match for repo-relative paths;
  - `*`;
  - `**`;
  - `**/` matching zero or more directories.
- `buildGroupTypedMemoryRecall()` now:
  - skips conditional docs whose `paths` do not match the current target paths;
  - boosts matched conditional docs;
  - records `conditionalMatched`, `conditionalSkipped`, target paths, and path-condition diagnostics.
- `buildGroupTypedMemoryLoadPlan()` now:
  - excludes unmatched conditional docs from the load order;
  - records matched/skipped conditional counts;
  - renders target paths and condition stats in child/global memory packets.
- `buildAgentMemoryContextBundle()` now derives target paths from the child-agent task text, explicit `targetPaths`, and target-agent frequent files.
- `buildGlobalGroupMemoryContext()` derives target paths from the global query before rendering per-group typed memory.

## Selftests

- Added `runGroupTypedMemoryPathConditionSelfTest()`.
- Extended child-agent typed memory context selftest with a matching `src/pay.ts` rule and a non-matching search rule.

## Operational Memory

- Use `paths` frontmatter for file-specific memories that should not always be injected.
- Use unconditional typed docs for global constraints, user requirements, and broad project context.
- When a conditional memory is skipped, the recall diagnostics expose `path_condition_miss`; this is expected and should not be treated as memory loss.

## Still Open

- CCM still does not auto-discover `.claude/rules/*.md` by walking project directories.
- CCM still does not support the full `ignore`/`picomatch` syntax surface from Claude Code, but the implemented subset covers the common file-rule patterns needed for child-agent dispatch.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupTypedMemoryPathConditionSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
  "pathCondition": true,
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
