# CCM Group Memory CC Parity - Phase 177

Date: 2026-07-10

## Focus

Phase 177 completes the main Agent repair dispatch path for post-compact reinjection candidates that disappear from replayed child Agent context.

CCM already had a reinjection gate and required each child Agent receipt to classify every recovered candidate as `used`, `ignored`, or `verified`. The remaining gap was the repair path: a missing file, skill, verification, or blocker candidate degraded into a generic `compact_boundary_replay_repair` item and lost the stable gate, candidate identity, source message, and actual child session receipt contract before dispatch.

## Implemented

- Preserved post-compact candidate metadata through:
  - replay needle
  - replay gap
  - repair action
  - repair work item
  - main Agent dispatch candidate
  - replay repair dispatch brief
  - WorkerContextPacket normalization and partial compact
  - assignment and timeline binding ledgers
  - final WorkerContextPacket rendering
- Added structured fields:
  - `reinjection_gate_id`
  - `post_compact_candidate_id`
  - `post_compact_candidate_kind`
  - `post_compact_candidate_value`
  - `post_compact_candidate_source_message_id`
- Raised missing post-compact reinjection candidates from medium to high priority so open repair items enter the main Agent dispatch candidate set without waiting for manual mutation.
- Added a post-compact-specific dispatch brief branch requiring:
  - recovery from raw transcript or typed MEMORY.md
  - current repository/source verification
  - `CCM_AGENT_RECEIPT.postCompactCandidateUsage`
  - the matching reinjection gate and candidate ID
  - `used`, `ignored`, or `verified`
  - `currentSourceVerified=true` for used/verified
  - an explicit reason for ignored
  - `memoryUsed` or `memoryIgnored`
  - `task_agent_session_id` and `native_session_id`
- Added dedicated quality checks:
  - `post_compact_reinjection_repair_dispatch_candidates`
  - `post_compact_reinjection_repair_dispatch_briefs`
- Added exported selftest:
  - `runMemoryCenterPostCompactReinjectionRepairDispatchSelfTest`
- Updated specialized read-plan brief reporting to sync the full active replay candidate set, preventing a targeted quality run from superseding unrelated ready repair briefs.

## Selftest Coverage

The Phase 177 selftest creates two missing reinjection candidates under one gate:

- a file candidate
- a verification command candidate

It proves:

- both become distinct high-priority repair actions and work items
- both candidates and briefs preserve gate, identity, kind, value, source message, boundary, and target project
- both briefs contain the complete used-or-ignored receipt contract
- both identities survive WorkerContextPacket construction and final rendering
- Memory Quality exposes and passes both new checks

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Phase 177 result:

```json
{
  "status": "ok",
  "candidateCoverageRate": 100,
  "candidateMetadataCoverageRate": 100,
  "briefCoverageRate": 100,
  "briefMetadataCoverageRate": 100,
  "expectedCandidates": 2,
  "coveredCandidates": 2,
  "expectedBriefs": 2,
  "coveredBriefs": 2
}
```

Focused regression:

```json
{
  "phase177": true,
  "phase176": true,
  "readPlanWorkItems": true,
  "replayRepairPlan": true,
  "replayRepairWorkItems": true,
  "replayDispatchCandidates": true,
  "postCompactDiscipline": true,
  "reinjectionProof": true,
  "runtimeKernel": true,
  "runtimeUsage": true,
  "phase175": true,
  "phase174": true,
  "phase173": true,
  "compactOutcome": true,
  "ranking": true,
  "ignorePolicy": true
}
```

`git diff --check` passed for the implementation files; Git only reported the repository's existing LF-to-CRLF warning.

## Invariants

- Memory Center and replay quality checks generate diagnostic repair context only. A real child Agent task still requires explicit main Agent dispatch.
- A post-compact candidate is not accepted merely because the gate was mentioned. The receipt must classify the exact candidate ID.
- `used` or `verified` requires current-source verification; `ignored` requires a reason.
- The receipt must be attributable to the actual task Agent and native provider session.
- Provider switch execution history remains ranking evidence only, never authorization. Explicit provider switches still require fresh valid receipt/checksum/local authority/task compatibility.

## Next Direction

Add post-dispatch receipt consumption and closure checks for post-compact reinjection repair briefs. The next proof boundary should verify that the exact brief and candidate were consumed by the bound child Agent session before the repair work item can close.
