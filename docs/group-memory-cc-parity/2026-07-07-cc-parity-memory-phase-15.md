# Phase 15 - Typed MEMORY.md Load Plan

## Goal

Move CCM typed group memory closer to Claude Code's memory-file loading model by making the `MEMORY.md` layer explicitly ordered, priority-aware, and include-aware. Project child Agents are often fresh third-party CLI sessions, so their memory packet needs to say not only which memories were recalled, but also how typed memories would be loaded and which memory wins when priorities conflict.

## Claude Code Reference

- Reference checked: `D:\claude-code\src\utils\claudemd.ts`.
- Claude Code memory loading has three important traits:
  - memory files are concrete context sources, not just abstract state;
  - files are loaded in a priority-aware order, with higher priority files loaded later;
  - `@include` references are expanded with cycle/depth safeguards.

## Implementation

- Added `ccm-group-typed-memory-load-plan-v1` in `backend/modules/collaboration/group-memory-index.ts`.
- The load plan records:
  - stable `MEMORY.md` entrypoint;
  - typed docs in priority order;
  - priority tiers: `entrypoint < reference < project < feedback < user`;
  - load order policy: lower-priority docs load first, higher-priority docs load later;
  - `@include` expansion with included files loaded before their parent;
  - missing include, external include, circular include, unreadable file, and max-depth issues;
  - entry count, bytes, estimated tokens, checksum, mtime, source, parent relation, and include depth.
- Includes are restricted to the current group's typed memory directory. This keeps child-agent context deterministic and avoids silently injecting arbitrary external files.
- Child-agent memory context now renders the typed `MEMORY.md` load plan.
- Global Agent multi-group memory context now renders each selected group's typed load plan.

## Selftests

- Added `runGroupTypedMemoryLoadPlanSelfTest()`.
- Extended child-agent typed memory context selftest to assert load plan rendering.
- Extended global group memory context selftest to assert load plan rendering.

## Operational Memory

- `loadPlan.status === "pass"` means the typed memory files can be treated as a clean priority-ordered memory layer.
- `status === "include_warnings"` means the child Agent may still use recalled memories, but should treat includes as partially degraded and rely on source manifest / raw transcript recovery where needed.
- `user` typed memories intentionally have the highest priority and are rendered later in load order, matching the Claude Code principle that later memory has stronger attention.

## Still Open

- CCM does not yet implement Claude Code style directory-walk discovery for project `.claude/rules/*.md`.
- CCM does not yet implement frontmatter path-conditional memory rules.
- CCM does not yet fire a dedicated "instructions loaded" hook with reload reason; Phase 13/14 made recovery and source state durable, but a cache/hook reload reason layer can still be added later.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupTypedMemoryLoadPlanSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "loadPlan": true,
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
