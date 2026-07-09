# CCM Group Memory CC Parity - Phase 102

## Topic

WorkerContextPacket context usage budget, aligned with Claude Code `/context`.

## Claude Code Reference

`D:\claude-code\src\commands\context\context-noninteractive.ts` and `context.tsx` collect the model-facing API view after compact-boundary filtering and micro-compact, then render category-level token usage including memory files, tools, custom agents, free space, and autocompact buffer.

## Goal

CCM child Agents are fresh third-party sessions, so every WorkerContextPacket should make its context cost auditable before dispatch. Phase 102 adds a stable context usage ledger to each packet and exposes it in Memory Center.

## Implementation

- `backend/agents/runtime-kernel.ts`
  - Added `buildWorkerContextUsage`.
  - Added `renderWorkerContextUsage`.
  - `buildWorkerContextPacket` now attaches `context_usage`.
  - `renderWorkerContextPacket` now renders `Context usage budget`.
  - Usage categories include:
    - worker packet envelope
    - task and goal
    - constraints and document findings
    - group memory rendered context
    - typed MEMORY.md recall
    - global memory
    - replay repair dispatch briefs
    - contract injections
    - dependencies
    - verification and acceptance
    - free space
    - autocompact buffer

- `backend/modules/collaboration/group-orchestrator.ts`
  - Replay repair assignment bindings now persist `worker_context_packet_context_usage`.
  - Render probes now record `has_context_usage_budget`.

- `backend/modules/knowledge/memory-control-center.ts`
  - Added report/check `worker_context_packet_context_usage`.
  - The report validates category presence, total/max tokens, free space, autocompact buffer, rendered budget visibility, and over-budget packets.
  - Memory Center overview now includes the report and emits alerts for weak groups.

## Selftests

- `runWorkerContextUsageSelfTest`
  - Proves packets categorize task, group memory, typed memory recall, replay repair briefs, free space, and autocompact buffer.
  - Proves rendered worker context includes `Context usage budget`.

- `runMemoryCenterWorkerContextPacketContextUsageSelfTest`
  - Proves a coordinator-generated assignment carries packet `context_usage`.
  - Proves the assignment binding ledger persists `worker_context_packet_context_usage`.
  - Proves Memory Center report and quality check reach `ok`.

## Validation

Passed:

- `npm run build:backend`
- `npm run check`
- `runWorkerContextUsageSelfTest`
- `runMemoryCenterWorkerContextPacketContextUsageSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofWorkerContextInjectionSelfTest`

Full package build and the native/provider proof repair selftest matrix should be run after this phase before considering the package synchronized.

## Stable Memory

WorkerContextPacket now has a CC-style context usage ledger. Future child Agent dispatches can inspect not only what memory was injected, but how much of the packet budget it consumed and whether free/autocompact buffer remains. This closes an important gap between "memory exists" and "memory can safely fit into every fresh third-party Agent session."
