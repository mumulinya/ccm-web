# Phase 68 - Cross-Group Suppression Freshness

## Objective

Continue CCM memory toward Claude Code parity by making cross-group Global Agent memory suppression time-aware and update-aware.

Phase 67 made CCM cautious when a Global Agent memory item had already been demoted or conflicted in other groups. Phase 68 prevents that caution from becoming permanent stale state: if the same Global Agent memory item is later updated after the cross-group arbitration evidence, CCM downgrades the old suppression to advisory instead of blocking active recall.

## Claude Code Reference

Relevant Claude Code patterns inspected in `D:\claude-code`:

- `src/query.ts` applies snip/microcompact before autocompact, so newer projected context can avoid heavier compaction.
- `src/QueryEngine.ts` treats compact boundaries as state transitions and releases pre-compaction history after the boundary has been persisted.
- `src/QueryEngine.ts` can inject memory mechanics only when a caller explicitly wires memory through `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`.
- `src/tools/AgentTool/agentMemory.ts` and `agentMemorySnapshot.ts` model agent memory as scoped, persistent, and updateable rather than a fixed one-shot context blob.

The Phase 68 CCM change follows the same principle: compacted or persisted memory evidence must continue to respect newer state.

## Behavior

`buildCrossGroupGlobalMemorySuppressionForItem` now records freshness metadata:

- `globalUpdatedAt`
- `latestEvidenceAt`
- `globalNewerByMs`
- `evidenceAgeMs`
- `maxEvidenceAgeMs`
- `newerGlobalGraceMs`
- `supersededByNewerGlobalMemory`
- `decayedToAdvisory`

Suppression now has three states:

- `suppressed: true` means other groups have current enough conflict/demotion evidence and the global item is background-only.
- `advisory: true` means cross-group evidence exists but should not block active recall.
- no suppression/advisory means no relevant cross-group evidence or evidence below threshold.

Default policy:

- cross-group suppression still triggers when one other group has a conflict or total occurrences reach threshold
- if the recalled Global Agent memory item has `updatedAt` newer than the latest cross-group evidence by more than `1000ms`, suppression becomes advisory
- if the cross-group evidence is older than `90 days`, suppression also becomes advisory
- advisory rows remain source-backed and visible for diagnosis

## Child Context

The rendered child Agent packet now includes:

- `跨群聊抑制新鲜度`
- `cross_group_suppression=advisory`
- `superseded=true/false`
- `decayed=true/false`
- `global_updated`
- `latest_cross_group_evidence`

This lets a third-party child Agent understand that old cross-group evidence exists, but that newer Global Agent memory has superseded it and should be used only after current-source verification.

## Source Tracking

The cross-group arbitration ledger directory is now included not only for hard suppression but also for advisory freshness rows:

- source manifest: `global_memory_cross_group_arbitration`
- compact file references: `global_memory_cross_group_arbitration`
- compact read plan: `read_for_cross_group_global_memory_suppression`
- raw source: `global_memory_cross_group_arbitration_dir`

This keeps advisory decisions auditable after compaction.

## Memory Center

Memory Center bridge rows now include:

- `crossGroupAdvisoryCount`
- `crossGroupSupersededCount`
- `crossGroupDecayedCount`
- `crossGroupEvidenceRequired`
- `renderedHasCrossGroupFreshness`
- `crossGroupSuppressionAdvisoryItems`

Added targeted quality check:

- `global_memory_cross_group_suppression_freshness`

It verifies that advisory rows are rendered, source-backed, and counted distinctly from hard suppression.

## Verification

Passed on 2026-07-08:

- `npm run build:backend`
- `npm run check`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- targeted `buildMemoryQualityReport({ checkIds: ["global_memory_cross_group_suppression_freshness"], cacheMaxAgeMs: 0 })`

The new backend self-test verified:

- a source group records a conflict for an old Global Agent memory item
- the same Global Agent memory id is later updated with a newer `updatedAt`
- a target group recalls the updated global item
- old cross-group suppression is downgraded to advisory
- child context renders the freshness advisory
- source manifest and compact references still point to the cross-group arbitration directory

The new Memory Center self-test verified:

- report status remains `ok`
- advisory and superseded counts are visible
- freshness rendering is detected
- source manifest and compact references are present
- `global_memory_cross_group_suppression_freshness` passes

## Current Status

Phase 68 is complete. CCM now avoids a dangerous long-term-memory failure mode where stale cross-group arbitration evidence permanently suppresses a newly updated Global Agent memory item.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add a Memory Center UI table for cross-group suppression and advisory rows.
- Add semantic contradiction scoring beyond keyword/newer-message heuristics.
- Add periodic background maintenance to prune test/stale arbitration ledger rows.
- Add child-Agent receipt feedback so a third-party child Agent can confirm whether advisory global memory was used, ignored, or verified.
