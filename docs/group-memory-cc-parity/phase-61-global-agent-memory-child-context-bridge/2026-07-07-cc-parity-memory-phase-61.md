# Phase 61 - Global Agent Memory Child Context Bridge

## Objective

Move CCM closer to Claude Code style memory continuity by bridging Global Agent long-term memory into each relevant group child-Agent context packet.

Before this phase, child Agent memory packets already carried group memory, typed MEMORY.md recall, project memory imports, global Claude memory imports, compact file references, and read-plan gates. The missing link was the Global Agent's own long-term memory store (`global-agent-memory/memory.json`): relevant global preferences, authorizations, mission outcomes, and unresolved cross-session facts were not consistently represented in the project child-Agent packet.

## Behavior

- `buildAgentMemoryContextBundle` now performs a structured Global Agent memory recall for the child Agent task query.
- The child bundle includes `global_agent_memory` with:
  - recall schema `ccm-child-global-agent-memory-recall-v1`
  - recalled item ids, types, scores, source sessions, message ids, and mission ids
  - the Global Agent memory file path
  - optional session summary and compact boundary metadata.
- `renderGroupMemoryContextBundle` renders a distinct section named `全局 Agent 长期记忆召回`.
- The rendered section explicitly says that global memory is only historical context and that file/task/auth state must be verified against current reality before action.
- User-requested ignore memory still wins. If the task says to ignore memory, Global Agent memory is not injected and the rendered packet contains no recalled global facts.

## Source Tracking

Global Agent memory is now part of the child memory source chain:

- `buildGroupMemorySourceManifest` can include `global_agent_memory` as `global_agent_memory_json`.
- `buildGroupCompactFileReferences` can include `global_agent_memory_json` as a compact file reference.
- `raw_sources.global_agent_memory_file` points to the actual Global Agent memory file.
- Reload audit can record `global_agent_memory_recall` as the context build reason when relevant global memory is recalled.

This means the bridge is not just text injection. It is traceable by manifest, reload audit, and compact reference/read-plan machinery.

## Memory Center

Memory Center now has a quality check:

- id: `child_global_agent_memory_bridge`
- label: `子 Agent 全局记忆桥接`
- report schema: `ccm-child-global-agent-memory-bridge-report-v1`

The report builds sampled child-Agent context packets and verifies that any recalled Global Agent memory is present in:

- rendered child context
- source manifest
- compact file references
- raw source metadata.

## Claude Code Parity Note

Claude Code style memory is layered: user/global memory, project memory, session memory, and compacted conversation recovery are all separate but composable. Phase 61 makes CCM's child-Agent packet closer to that model:

1. Group memory remains the primary coordination context.
2. Global Agent memory becomes a bounded, source-tracked layer.
3. Project/Claude memory imports remain typed MEMORY.md inputs.
4. Ignore-memory semantics override every layer.
5. Current repository/system state remains the authority for execution.

## Verification

Passed on 2026-07-07:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runGroupGlobalClaudeMemoryImportContextSelfTest`
- `runGroupTypedMemoryContextSelfTest`
- `runGlobalGroupMemoryContextSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`
- `buildMemoryQualityReport({ refresh: true })` includes `child_global_agent_memory_bridge` and the bridge check scored 100 in the current run.

Note: the full Memory Quality report can still be `fail` because of unrelated existing historical quality gaps. Phase 61's bridge check itself passed.

## Next Upgrade Direction

- Add global/group typed-memory conflict handling so stale global facts can be demoted when a group has newer verified evidence.
- Add stronger cross-group recall de-duplication so the Global Agent can dispatch multi-group missions without repeating the same global memory in every group packet.
- Convert repeated bridge usage outcomes into typed memory distillation signals.
- Continue toward micro-compact and partial compact behavior that can operate across group, global, and project memory layers without mixing scopes.
