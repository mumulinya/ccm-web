# Phase 13 - Post-Compact Recovery Audit

## Goal

Push CCM group memory closer to Claude Code style post-compact behavior by making every successful group-memory compaction carry a deterministic recovery audit. The audit tells the group main Agent, global Agent, and fresh third-party child-agent sessions whether the compacted memory can still be trusted, reinjected, and recovered from raw transcript paths.

## Claude Code Reference

- Reference checked: `D:\claude-code\src\services\compact\postCompactCleanup.ts`.
- Claude Code's useful signal here is not only summarization; after compaction it resets derived compact/cache/system-prompt state and protects main-thread state from subagent compaction side effects.
- CCM does not share the exact runtime cache model, so Phase 13 records an explicit post-compact recovery audit on the group memory artifact itself. This makes the recovery state durable and visible to worker handoff instead of being an implicit in-process cleanup assumption.

## Implementation

- Added `ccm-post-compact-recovery-audit-v1` in `backend/modules/collaboration/group-memory-compaction.ts`.
- The audit checks:
  - raw transcript path is recorded;
  - compact boundary can be resolved against raw messages;
  - compact window matches `keepIndex`;
  - summary checksum and digest are available;
  - `preservedSegment` is present for raw recent-window recovery;
  - post-compact reinjection plan is present;
  - context budget is recorded;
  - post-compact context pressure warning is suppressed until the next sample;
  - PTL emergency and recovery states are mutually exclusive;
  - partial sidecar segments keep the raw transcript contract.
- The same audit is written to:
  - `compactBoundary.post_compact_restore.recoveryAudit`;
  - `compaction.postCompactRecoveryAudit`;
  - `messageCompression.postCompactRecoveryAudit`.
- Child-agent memory context rendering now includes the audit status, pass count, raw transcript path, candidate count, and dispatch action.
- Global Agent multi-group memory rendering now includes per-group post-compact recovery audit status.

## Selftests

- Added `runGroupMemoryPostCompactRecoveryAuditSelfTest()`.
- Extended auto-compaction selftest to require the recovery audit in both `compaction` and `messageCompression`.
- Extended child/global memory context selftests to assert audit rendering.

## Operational Memory

- Treat `postCompactRecoveryAudit.status === "pass"` as the normal condition for injecting a memory packet into a fresh project child Agent session.
- Treat `status === "degraded"` as usable but requiring raw transcript / typed MEMORY.md recovery awareness.
- Treat `status === "failed"` as requiring repair or rebuild before dispatch when possible.
- This phase is a durable bridge between Claude Code's post-compact cleanup intent and CCM's group/global/child-agent architecture.

## Verification

- Passed:
  - `npm run check`
  - `npm run build:backend`
  - dist memory regression including `runGroupMemoryPostCompactRecoveryAuditSelfTest()`

Dist regression result:

```json
{
  "typed": true,
  "distill": true,
  "distillQuality": true,
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
