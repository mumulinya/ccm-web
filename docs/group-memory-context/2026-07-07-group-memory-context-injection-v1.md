# Group Memory Context Injection V1

Date: 2026-07-07

## Goal

Make CCM group-chat memory work more like Claude Code's memory/compaction/context system: old group messages are compressed into a stable summary, recent messages stay visible, and each project child agent receives the group memory as task context even when the third-party agent starts a fresh session.

## Claude Code Reference

- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
  - Keep a bounded recent window after a compact boundary.
  - Treat the compacted session memory as the post-compact source of truth.
- `D:\claude-code\src\services\compact\compact.ts`
  - Record compact boundaries and restore key post-compact context.
  - Preserve attachments/skills/recent files under explicit budgets.
- `D:\claude-code\src\context.ts`
  - Build context from stable memory files and project context before each model turn.
- `D:\claude-code\src\memdir\teamMemPrompts.ts`
  - Store memory as file-based, scoped, reusable project/team context.

## Implementation

### Group Memory Snapshot

`backend/modules/collaboration/memory.ts`

- Added a sync group memory snapshot that updates when `buildGroupContextPacket()` or `buildAgentMemoryContextBundle()` runs.
- The snapshot stores:
  - `conversationSummary`
  - `messageDigest`
  - `compactBoundary`
  - `compaction`
  - `factAnchors`
  - `persistentRequirements`
  - token budget metadata
- Raw group messages remain in `~/.cc-connect/group-messages/<groupId>.json`; the compressed summary never deletes source messages.

### Child Agent Context Bundle

`buildAgentMemoryContextBundle(groupId, project, task)` now returns a structured `ccm-group-memory-context-v1` object with:

- group goal/current phase
- compact boundary and summary checksum
- persistent user requirements
- fact anchors
- target agent memory and recent receipts
- related work from other agents
- task-relevant historical raw evidence retrieved from pre-compact messages
- raw source paths for memory and transcript recovery

`buildAgentMemoryPacket()` still returns text for old prompt paths, but it now renders from the structured bundle.

### WorkerContextPacket Injection

`backend/agents/worker-handoff.ts`

- Preserves structured memory instead of flattening it into one short summary.
- Renders a `平台记忆/上下文` section inside the self-contained worker handoff.
- Selftest now verifies that group memory survives into `worker_context_packet.memory`.

`backend/agents/runtime-kernel.ts`

- `renderWorkerContextPacket()` renders platform memory for diagnostics/timeline visibility.
- Runtime kernel selftest now verifies memory rendering.

### Dispatch Paths

`backend/modules/collaboration/collaboration.ts`

- Main group dispatch path now builds `groupMemoryBundle` and passes it into worker handoff/development contract.
- Direct task execution with `group_id` injects the same bundle.
- Auto-assign with `group_id` injects the same bundle.
- If a global mission handoff exists, group memory and global mission memory are wrapped together as `ccm-worker-memory-context-v1`.

## Verification

Passed:

```text
npm run check
npm run build:backend
node -e "const h=require('./ccm-package/dist/agents/worker-handoff.js').runWorkerHandoffSelfTest(); const r=require('./ccm-package/dist/agents/runtime-kernel.js').runAgentRuntimeKernelSelfTest(); console.log(JSON.stringify({handoff:h.pass, handoffChecks:h.checks, runtime:r.pass, runtimeChecks:r.checks}, null, 2));"
```

Temporary group memory bundle selftest also passed:

- generated `ccm-group-memory-context-v1`
- compacted old group messages
- preserved persistent requirement: `必须保留权限校验`
- retrieved pre-compact raw evidence by message id
- rendered `memoryUsed` requirement in the child agent memory packet

## Stable Memory

Future child-agent dispatch work should treat group memory as first-class context, not as a best-effort prompt suffix. The desired shape is:

1. Main agent builds or refreshes group memory.
2. Memory is stored with a compact boundary and source recovery pointers.
3. WorkerContextPacket carries structured memory.
4. Rendered handoff tells the child agent the memory is mandatory context.
5. Child agent receipt must declare `memoryUsed` or `memoryIgnored`.

Next useful evolution: run the async/hybrid `compactGroupConversationMemory()` path from a background trigger or message append path, so model-assisted compaction and deterministic sync compaction share the same boundary lifecycle.
