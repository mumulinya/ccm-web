# Group Memory Auto Compaction Trigger V1

Date: 2026-07-07

## Goal

Finish the next memory-system upgrade after `ccm-group-memory-context-v1`: connect the existing async/hybrid `compactGroupConversationMemory()` pipeline to group message writes, so group memory can evolve in the background and share the same compact boundary lifecycle used for child-agent context injection.

## Implementation

### Message Append Hook

`backend/modules/collaboration/storage.ts`

- Added `registerGroupMessageAppendHook()`.
- `appendGroupMessage()` now calls registered hooks after the message is persisted and trace event is appended.
- Hook failures are swallowed so group chat writes are never blocked by background memory work.

### Background Compaction Scheduler

`backend/modules/collaboration/memory.ts`

- Added `scheduleGroupMemoryAutoCompaction(groupId, options)`.
- Added `runGroupMemoryAutoCompactionNow(groupId, options)`.
- Added `ensureGroupMemoryAutoCompactionHook()`, registered on module load.

Runtime behavior:

- groupId scoped debounce, default `2500ms`.
- one compaction run per group at a time.
- if messages arrive while a run is active, a pending rerun is scheduled.
- failures are written to `memory.compaction.background` and do not break message writes.
- raw messages stay in `~/.cc-connect/group-messages/<groupId>.json`.

The scheduler calls:

```ts
compactGroupConversationMemory({
  groupId,
  messages,
  memory,
  config,
  transcriptPath,
  force,
  rebuild,
})
```

Config is loaded from the group orchestrator config. If `memoryCompactionUseModel === true` or `memoryCompactionMode === "hybrid"`, the model-assisted summarizer can participate; otherwise the deterministic structured compaction path remains the fallback.

### Shared Boundary Lifecycle

The background result is saved back into the same group memory file:

- `conversationSummary`
- `messageDigest`
- `compactBoundary`
- `compaction.lastCompactedMessageId`
- `compaction.summaryChecksum`
- `factAnchors`
- `persistentRequirements`
- `messageCompression`
- `compaction.background`

This means child-agent bundles created by `buildAgentMemoryContextBundle()` automatically see either the latest deterministic sync snapshot or the latest async/hybrid compaction boundary.

## Verification

Passed:

```text
npm run check
npm run build:backend
node -e "(async()=>{const m=require('./ccm-package/dist/modules/collaboration/memory.js'); const auto=await m.runGroupMemoryAutoCompactionSelfTest(); const h=require('./ccm-package/dist/agents/worker-handoff.js').runWorkerHandoffSelfTest(); const r=require('./ccm-package/dist/agents/runtime-kernel.js').runAgentRuntimeKernelSelfTest(); console.log(JSON.stringify({autoCompact:auto.pass, autoChecks:auto.checks, handoff:h.pass, runtime:r.pass}, null, 2)); if(!auto.pass||!h.pass||!r.pass) process.exit(1);})()"
```

Selftest coverage:

- background compaction succeeds
- compact boundary is recorded
- `memory.compaction.background.status === "compacted"`
- persistent requirement sentinel survives the summary
- raw group transcript remains untouched
- worker handoff still preserves memory context
- runtime kernel still renders platform memory

## Stable Memory

Group memory compaction now has two cooperating paths:

1. Synchronous deterministic snapshot during context build, used for immediate child-agent prompt safety.
2. Background auto compaction after message append, used for durable async/hybrid boundary maintenance.

Future changes should keep both paths writing the same group-scoped memory shape and avoid adding any message-write dependency on model latency.
