# Phase 62 - Global/Group Memory Arbitration

## Objective

Continue CCM memory toward Claude Code parity by adding conflict and freshness arbitration between Global Agent long-term memory and current group memory.

Phase 61 made relevant Global Agent memory available to project child Agents. Phase 62 makes that bridge safer: if a group has newer same-topic evidence, the child Agent packet now demotes stale global memory instead of presenting it as equally authoritative.

## Behavior

Each recalled Global Agent memory item can now carry:

- `arbitration.status`
  - `active_global_context`
  - `demoted_by_newer_group_evidence`
  - `possible_conflict_with_newer_group_memory`
- `arbitration.authority`
  - `global_agent_memory` when active
  - `group_memory` when newer group evidence wins
- `arbitration.action`
  - `use_as_relevant_context_after_verification`
  - `do_not_apply_directly_treat_as_background`
- `decisiveEvidence`
  - source, type, message id, timestamp, matched terms, and compacted text.

The bundle-level `global_agent_memory.arbitration` summary reports:

- local evidence count
- active count
- demoted count
- conflict count
- authority order.

## Authority Rule

The child Agent packet now uses this memory priority model:

1. current explicit user instruction
2. current group memory / group messages
3. typed MEMORY.md
4. Global Agent memory

Global Agent memory is still useful, but if the group has newer same-topic evidence, it becomes background only. The rendered child context explicitly says that demoted/conflicting global memory must not be applied directly.

## Rendering

`renderGroupMemoryContextBundle` now shows:

- arbitration status in the `全局 Agent 长期记忆召回` line
- demoted/conflict counts
- an explicit `全局记忆仲裁规则`
- per-item arbitration status
- `local_evidence=...` rows for decisive newer group evidence.

Direct group evidence is preferred over derived typed recall evidence when selecting decisive evidence, because near-source group facts should explain the demotion first.

## Memory Center

`child_global_agent_memory_bridge` now also reports:

- `demotedCount`
- `conflictCount`
- `renderedHasArbitration`
- `missingArbitrationRenderCount`

This keeps the bridge auditable in Memory Center instead of hiding arbitration inside rendered text only.

## Verification

Passed on 2026-07-07:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runGroupGlobalClaudeMemoryImportContextSelfTest`
- `runGroupTypedMemoryContextSelfTest`
- `runGlobalGroupMemoryContextSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairWorkItemsSelfTest`
- `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`
- lightweight `buildMemoryQualityReport({ cacheMaxAgeMs: 0 })` includes `child_global_agent_memory_bridge`; current run showed score 100 with demoted/conflict statistics present.

## Known Follow-Up

Full `buildMemoryQualityReport({ refresh: true })` timed out in the current large real workspace. The Phase 62 bridge and arbitration checks pass, but the full quality report still needs a future incremental/section-scoped refresh mode so heavy RAG and broad diagnostics cannot block a targeted memory quality run.

## Next Upgrade Direction

- Add persistent arbitration ledger rows so repeated global/group conflicts can be distilled into typed memory.
- Add cross-group duplicate suppression for the same global item across many child Agent packets.
- Add stronger semantic contradiction detection beyond the conservative keyword/newer-evidence heuristic.
- Add targeted Memory Center refresh APIs for one report/check at a time.
