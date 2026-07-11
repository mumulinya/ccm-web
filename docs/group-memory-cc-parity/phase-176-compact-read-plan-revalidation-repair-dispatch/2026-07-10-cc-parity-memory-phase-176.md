# CCM Group Memory CC Parity - Phase 176

Date: 2026-07-10

## Focus

Phase 176 completes the main Agent dispatch path for compact file reference read-plan revalidation repairs.

Before this phase, a stale compact read plan or a receipt from the wrong child Agent session could create a `compact_read_plan_revalidation_repair` work item, but the dedicated quality boundary stopped before proving that every repair became a complete dispatch candidate and self-contained dispatch brief.

## Implemented

- Mirrored compact read-plan repair identity and session fields from work item to dispatch candidate:
  - `revalidation_gate_id`
  - `read_plan_id`
  - `reference_id`
  - `expected_task_agent_session_id`
  - `expected_native_session_id`
  - `receipt_task_agent_session_id`
  - `receipt_native_session_id`
  - `session_mismatch`
- Added dedicated candidate report and quality check:
  - `compact_file_reference_read_plan_revalidation_repair_dispatch_candidates`
- Added dedicated dispatch brief report and quality check:
  - `compact_file_reference_read_plan_revalidation_repair_dispatch_briefs`
- Added a read-plan-specific replay repair brief branch that places the critical contract early in `worker_task`:
  - bound `revalidation_gate_id` and `read_plan_id`
  - `reference_id`
  - expected task/native child Agent session IDs
  - previous receipt session IDs
  - `CCM_AGENT_RECEIPT.readPlanRevalidationUsage` or `memoryUsed` / `memoryIgnored`
  - `currentSourceVerified=true` or an explicit ignored reason
- Kept explicit `groupIds` quality runs deterministic by reading the existing repair ledger instead of recomputing a live revalidation gate that could close synthetic or externally prepared repair items.
- Added exported selftest:
  - `runMemoryCenterCompactFileReferenceReadPlanRevalidationRepairDispatchSelfTest`

## Selftest Coverage

The Phase 176 selftest creates two open repair items that share one revalidation gate but have different `read_plan_id` and `reference_id` values.

It proves:

- the two repair items remain distinct through candidate and brief compilation
- both candidates and briefs preserve gate, reference, expected session, receipt session, and mismatch metadata
- at least one wrong-session receipt remains marked `session_mismatch=true`
- every `worker_task` is self-contained and includes the gate, read plan, reference, session requirements, receipt contract, and current-source verification requirement
- both new checks are available through `buildMemoryQualityReport`

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Phase 176 result:

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
  "phase176": true,
  "readPlanWorkItems": true,
  "phase175": true,
  "pressureDispatch": true,
  "pressureTyped": true,
  "pressureReceipt": true,
  "phase174": true,
  "phase173": true,
  "compactOutcome": true,
  "ranking": true,
  "runtimeUsage": true,
  "ignorePolicy": true
}
```

`git diff --check` passed for the two implementation files; Git only reported the repository's existing LF-to-CRLF warning.

## Invariants

- A read-plan revalidation repair brief is diagnostic context until the main Agent explicitly dispatches it. It never creates a real child Agent task by itself.
- A receipt from a different task Agent or native session cannot satisfy the bound read-plan revalidation gate.
- The child Agent must re-read the current source before relying on a stale compact read plan.
- Provider switch execution history remains ranking evidence only, never authorization. An explicit provider switch still requires a fresh valid receipt/checksum/local authority/task compatibility decision.

## Next Direction

Extend the same candidate-and-brief proof boundary to post-compact reinjection repairs so every missing memory object that is scheduled for reinjection has an auditable target session, required memory identity, and used-or-ignored receipt contract.
