# Phase 67 - Cross-Group Global Memory Suppression

## Objective

Continue CCM memory toward Claude Code parity by preventing stale Global Agent memory from being repeatedly injected into unrelated group child Agent sessions after other groups have already proven that memory stale, demoted, or conflicting.

Phase 65 persisted group/global arbitration. Phase 66 distilled repeated same-group conflicts into typed MEMORY.md. Phase 67 adds the cross-group layer: a child Agent packet now checks other groups' arbitration ledgers before treating a recalled Global Agent memory item as active context.

## Behavior

`buildChildGlobalAgentMemoryContext` now builds a cross-group suppression index from `group-global-memory-arbitration/*.json`.

Default behavior:

- scan recent group/global arbitration ledgers
- exclude the current group from the cross-group source set
- aggregate by `globalMemoryId`
- count source groups, conflict groups, demotion groups, occurrence count, typed memory docs, and source ledger files
- suppress a recalled global item when at least one other group has a conflict for that same global memory, or when total cross-group occurrences reach the threshold
- attach structured `crossGroupSuppression` to each recalled global memory item
- keep suppressed global memory visible as background, instead of silently hiding it
- mark the child context action as background-only / verify-current-group-before-use

The rendered child Agent memory packet now includes:

- `cross_group_suppressed` in the global recall summary
- a `跨群聊全局记忆抑制` rule line
- per-item `cross_group_suppression=background_only`
- `cross_group_evidence` rows sourced from other groups' arbitration ledgers

This keeps the memory useful for investigation while preventing stale Global Agent conclusions from being applied as current facts.

## Source Tracking

The cross-group suppression source is now tracked through the same recovery surfaces used by compacted child Agent packets:

- source manifest entry: `global_memory_cross_group_arbitration`
- compact file reference: `global_memory_cross_group_arbitration`
- read plan action: `read_for_cross_group_global_memory_suppression`
- raw source: `global_memory_cross_group_arbitration_dir`

This means a third-party child Agent can see that suppression was evidence-backed and can inspect the ledger directory when needed, without treating cross-group evidence as current-group truth.

## Memory Center

Memory Center now reports cross-group suppression fields in the child Global Agent memory bridge report:

- `crossGroupSuppressedCount`
- `crossGroupSuppressionRequired`
- `renderedHasCrossGroupSuppression`
- `sourceManifestHasCrossGroupArbitration`
- `compactReferencesHasCrossGroupArbitration`
- `crossGroupSuppressionSourceDir`
- `crossGroupSuppressionItems`

Added targeted quality check:

- `global_memory_cross_group_suppression`

It verifies that every detected cross-group suppression is rendered into the child Agent packet and is backed by source manifest and compact file references.

## Additional Hardening

The arbitration signature now hashes the stabilized `signatureEvidence` instead of the raw decisive evidence object. This makes repeated conflict detection less sensitive to object ordering or incidental evidence fields.

The local/global memory conflict heuristic was also tightened:

- generic English headings such as `current goal`, `requirements`, and `constraints` are ignored as arbitration tokens
- generic Chinese tokens such as `目标`, `需求`, `群聊`, `全局`, and `验证` are ignored
- `current/latest` only count as change signals when tied to concrete nouns such as rule, state, version, source, policy, or plan

This reduces false conflicts from typed MEMORY.md headings while preserving explicit stale-rule conflicts.

One unrelated TypeScript build blocker was fixed:

- `backend/tools/runtime-tool-sync.ts` no longer imports `parseMcpGrant` while also declaring a local `parseMcpGrant`.

## Verification

Passed on 2026-07-08:

- `npm run build:backend`
- `npm run check`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runGroupGlobalAgentMemoryBridgeContextSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- targeted `buildMemoryQualityReport({ checkIds: ["global_memory_cross_group_suppression"], cacheMaxAgeMs: 0 })`

The new backend self-test verified:

- group A records a conflict for a stale Global Agent memory item
- group B recalls the same global item
- group B receives `crossGroupSuppression.suppressed === true`
- suppression includes the source group A ledger
- child packet renders `跨群聊全局记忆抑制`
- source manifest and compact references include the cross-group arbitration source directory
- compact read plan can target the cross-group suppression source

The new Memory Center self-test verified:

- bridge report marks the target group `ok`
- cross-group suppression count is reported
- rendered packet includes the warning
- source manifest and compact references are present
- `global_memory_cross_group_suppression` passes

## Current Status

Phase 67 is complete. CCM can now use multi-group arbitration history to keep stale Global Agent memory from being repeatedly treated as active context in fresh project child Agent sessions.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add a Memory Center UI table for cross-group suppression rows and source ledgers.
- Add semantic contradiction scoring beyond keyword/newer-message heuristics.
- Add periodic background maintenance to prune test/stale arbitration ledger rows and refresh global suppression summaries.
- Add per-memory suppression decay so an old cross-group conflict can become advisory-only after newer verified Global Agent memory supersedes it.
