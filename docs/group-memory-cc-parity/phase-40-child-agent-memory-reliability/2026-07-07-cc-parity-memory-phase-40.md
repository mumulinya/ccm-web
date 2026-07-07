# Phase 40: Child Agent Memory Reliability

## Goal

Continue the long-term CCM memory upgrade toward Claude Code parity by scoring whether each project child Agent reliably receives, acknowledges, and uses group memory after compression.

CCM child Agents are third-party fresh sessions such as Claude Code, Cursor, or Codex. The group main Agent needs per-child-Agent evidence, not only group-level totals.

## Implemented

- Added `buildChildAgentMemoryReliabilityReport()` in `backend/modules/knowledge/memory-control-center.ts`.
- Added `evaluateChildAgentMemoryReliability()` as a Memory Center quality check.
- Added group detail diagnostics under `postCompactUsage.agentReliability`.
- Added overview-level `childAgentReliabilityReport` and weak-Agent alerts.
- Added Memory Center UI panel named `子 Agent 记忆可靠性`.
- Added selftest `runMemoryCenterChildAgentMemoryReliabilitySelfTest()`.

## Scoring Signals

Each `groupId + child Agent` row combines:

- Receipt discipline:
  - receipt task count
  - `memoryUsed` / `memoryIgnored` declaration rate
  - actual `memoryUsed` rate
- Post-compact candidate discipline:
  - candidate rows checked
  - strict `used` / `ignored` / `verified` classification rate
  - missing classifications
  - stale promoted count
- Post-compact first-dispatch marker:
  - marker count
  - first dispatch count
  - followup count
  - missing marker gap when a compacted group has child-Agent memory receipts but no first-dispatch marker

Weighted score:

- receipt: 45
- candidate discipline: 35
- first dispatch marker: 20

## Files

- `backend/modules/knowledge/memory-control-center.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `docs/group-memory-cc-parity/phase-40-child-agent-memory-reliability/2026-07-07-cc-parity-memory-phase-40.md`

## Verification

Passed:

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `memoryCenter.runMemoryCenterChildAgentMemoryReliabilitySelfTest()`
- `memoryCenter.runMemoryCenterPostCompactDispatchMarkerTrendSelfTest()`
- `memory.runGroupPostCompactFirstDispatchMarkerSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineTrendSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactCandidateDisciplineSelfTest()`
- `memoryCenter.runMemoryCenterPostCompactUsageDiagnosticsSelfTest()`
- `memory.runGroupPostCompactCandidateUsageLedgerSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageDistillationSelfTest()`
- `groupMemoryIndex.runGroupTypedMemoryPostCompactUsageScoringSelfTest()`
- `collaboration.runPostCompactReinjectionGateReceiptValidationSelfTest()`
- `collaboration.runCollaborationUxSelfTest()`

## Result

CCM can now identify weak project child Agents in a multi-Agent group chat. The main group Agent can see which third-party child Agent is failing to use memory, failing to classify post-compact candidates, or missing the first-dispatch marker after compaction.

## Next Candidates

- Add a compact-boundary timeline that correlates token pressure, recovery audit, first-dispatch latency, candidate usage, and per-Agent reliability.
- Add explicit pre/post compact hook ledgers to make hook outcomes first-class Memory Center diagnostics.
- Add automatic targeted rework policy for child Agents whose memory reliability stays below threshold.
