# Phase 70 - Semantic Global Memory Arbitration

## Objective

Continue CCM memory toward Claude Code parity by making Global Agent memory arbitration semantic, scored, and explainable.

Before this phase, CCM could demote Global Agent memory when newer group evidence shared enough tokens and matched explicit conflict patterns such as `不再`, `改为`, or `do not`. That was useful, but too shallow for long-running group chats: a child Agent can receive a new third-party session, see stale global memory, and miss that the group has already moved to another named rule or implementation.

Phase 70 adds deterministic semantic risk scoring to the Global Agent memory bridge.

## Claude Code Reference

Relevant Claude Code source inspected in `D:\claude-code`:

- `src/query.ts` applies snip and microcompact before autocompact, preserving granular state when possible.
- `src/query.ts` rebuilds post-compact messages after compaction, so downstream turns use an explicit state transition.
- `src/QueryEngine.ts` treats compact boundary messages as replayable state and releases pre-compact history only after the boundary is persisted.
- `src/QueryEngine.ts` injects memory mechanics only when memory is intentionally wired through `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`.
- `src/tools/AgentTool/agentMemory.ts` and `agentMemorySnapshot.ts` model scoped Agent memory as persistent and recoverable.

The CCM change follows the same principle: a child Agent context should not merely contain memory text; it should carry the reason, confidence boundary, source evidence, and downgrade rule that tell the new session how to use that memory.

## Behavior

`arbitrateChildGlobalAgentMemoryItem` now computes a semantic risk object for each matched local evidence row.

Signals include:

- shared file anchors
- shared sentinel anchors
- named rule or policy differences
- local replacement/current-rule signals
- global positive directive superseded by newer local evidence
- legacy/stale wording
- newer local evidence

The resulting arbitration now includes:

- `semanticRisk`
- `semanticRiskScore`
- `semanticReasons`
- per-evidence `semanticRiskScore`
- per-evidence `semanticReasons`
- per-evidence `semanticRisk`

Conflict remains conservative: semantic risk must reach the conflict threshold and still share a concrete anchor such as a file, sentinel, or enough task terms.

## False-Positive Guard

The first implementation caught a useful boundary case: generic tags such as `user_requirement` were being treated as named rules.

The rule-entity extractor now ignores generic metadata-style tags and only treats more implementation-shaped identifiers as rule terms, such as:

- `*-rule`
- `*-policy`
- `*-mode`
- `*-strategy`
- `*-pipeline`
- `*-provider`
- `*-adapter`
- `*-version`

This keeps cross-group suppression targets from being falsely converted into local semantic conflicts just because they mention "current state" or "verify current source".

## Child Agent Context

Rendered child Agent memory now exposes semantic arbitration directly:

- item line: `semantic_risk=<score>;semantic=<level>;reasons=<...>`
- evidence line: `semantic_risk=<score>;semantic_reasons=<...>`

This means a third-party child Agent session can see both the stale Global Agent memory and the reason it was demoted.

## Ledger And Distillation

Group global-memory arbitration ledger entries now persist:

- `semanticRiskScore`
- `semanticRiskLevel`
- `semanticReasons`
- per-evidence semantic risk fields

Ledger summaries now expose:

- `semanticRiskCount`
- `semanticConflictCount`
- `maxSemanticRiskScore`
- semantic fields in `latestEntries`
- semantic fields in `distillationCandidates`

Typed MEMORY.md distillation now writes semantic risk metadata into generated arbitration docs, so repeated conflicts remain explainable after compaction and reload.

## Memory Center

Memory Center bridge reporting now tracks:

- `semanticRiskCount`
- `semanticConflictCount`
- `maxSemanticRiskScore`
- `renderedHasSemanticArbitration`
- `missingSemanticArbitrationRenderCount`

The Memory Center quality UI also exposes semantic arbitration in the Global Memory Arbitration panel:

- `semantic`
- `max risk`

The existing panel still shows:

- hard cross-group suppression
- advisory freshness
- superseded rows
- missing render/source counts

## New Self-Test

Added:

- `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`

It verifies a scenario where:

- Global Agent memory says `src/semantic-arbitration.ts` must use `stripe-v1-policy`.
- Newer group evidence says the current strategy uses `ledger-v2-policy`.
- The group evidence does not rely on a simple `不再` / `改为` phrase.
- Semantic arbitration still scores the mismatch as high risk.
- The global memory is demoted as a conflict.
- The child Agent context renders semantic risk.
- The arbitration ledger persists semantic risk.
- source manifest and compact references still track the arbitration ledger.

## Verification

Passed on 2026-07-08:

- `npm run build:backend`
- `npm run check`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `node scripts\main-agent-decision-ui-selftest.mjs`
- `runGroupGlobalAgentMemorySemanticArbitrationSelfTest`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionContextSelfTest`
- `runGroupGlobalAgentMemoryCrossGroupSuppressionFreshnessSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupSuppressionSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryCrossGroupFreshnessSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`

## Current Status

Phase 70 is complete. CCM now has scored, explainable semantic arbitration for Global Agent memory before that memory reaches project child Agents.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add child-Agent receipt feedback so a third-party child Agent can declare whether semantic/advisory memory was used, ignored, or verified.
- Add replay coverage proving semantic arbitration survives compact/reload boundaries.
- Add periodic maintenance for stale/test arbitration ledger rows.
- Add richer contradiction dimensions for file move, API contract, dependency version, and authorization-policy changes.
