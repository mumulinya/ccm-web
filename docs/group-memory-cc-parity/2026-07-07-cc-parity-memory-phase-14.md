# Phase 14 - Memory Source Manifest

## Goal

Make CCM's group memory context behave more like Claude Code's memory-file loading path: every child-agent and global-agent memory packet should be able to say which durable memory files produced the context, whether those files exist, and whether the packet is safe to trust as a fresh source-derived memory view.

## Claude Code Reference

- Reference checked:
  - `D:\claude-code\src\utils\claudemd.ts`
  - `D:\claude-code\src\context.ts`
- Claude Code loads memory files as concrete context sources: managed/user/project/local memory, `.claude/rules/*.md`, and included files.
- It also differentiates cache invalidation from context reload with `clearMemoryFileCaches()` and `resetGetMemoryFilesCache(reason)`, so compaction can cause instructions to be reloaded with the correct reason.

## CCM Gap

Before this phase, CCM exposed raw source paths in `raw_sources`, but the child Agent could not tell whether those files currently existed, what their fingerprint was, how many typed MEMORY.md docs were included, or whether the context packet had a stable source manifest.

That mattered because project child Agents are often fresh third-party CLI sessions. They need a durable, self-contained memory packet that says: "this context came from these exact group memory sources."

## Implementation

- Added `ccm-group-memory-source-manifest-v1` in `backend/modules/collaboration/memory.ts`.
- The manifest records:
  - `group_memory` JSON;
  - raw `group_messages` transcript JSON;
  - typed memory directory;
  - typed `MEMORY.md` entrypoint;
  - typed memory docs;
  - recall and distillation ledgers when available.
- Each entry records existence, kind, bytes, mtime, checksum mode, short checksum, and source purpose.
- Large files use a bounded head/tail checksum window instead of loading unbounded transcript content into the context packet.
- Child-agent memory context now includes and renders the source manifest.
- Global Agent multi-group memory context now includes and renders each group's source manifest.

## Selftests

- Added `runGroupMemorySourceManifestSelfTest()`.
- Extended child-agent typed memory context selftest to assert source manifest rendering.
- Extended global group memory context selftest to assert source manifest rendering.

## Operational Memory

- Treat `source_manifest.status === "pass"` as evidence that the memory packet was built from present durable sources.
- If `missingRequired` contains `group_memory`, `group_messages`, or `typed_memory_index`, the child Agent should not assume old memory exists and should rebuild evidence from current task + live repo inspection.
- The manifest is not a replacement for raw recovery; it is a compact proof of where raw recovery should come from.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupMemorySourceManifestSelfTest()`

Dist regression result:

```json
{
  "typed": true,
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
