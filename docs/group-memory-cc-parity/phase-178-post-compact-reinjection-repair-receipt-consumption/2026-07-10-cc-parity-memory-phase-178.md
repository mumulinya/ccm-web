# CCM Group Memory CC Parity - Phase 178

Date: 2026-07-10

## Focus

Phase 178 adds post-dispatch receipt consumption and closure proof for post-compact reinjection repair briefs.

Phase 177 proved that a missing recovered-memory candidate reaches the actual WorkerContextPacket with its gate and candidate identity intact. The remaining risk was false closure: generic replay repair consumption could mention a brief without proving that the bound child Agent session classified the exact reinjection gate and candidate.

## Implemented

- Added a structured receipt proof:
  - `ccm-post-compact-reinjection-repair-receipt-proof-v1`
- The proof validates:
  - matching `reinjection_gate_id`
  - matching `post_compact_candidate_id`
  - legal `postCompactCandidateUsage` state: `used`, `verified`, or `ignored`
  - `currentSourceVerified=true` for used/verified
  - explicit reason for ignored
  - matching gate/candidate reference in `memoryUsed` or `memoryIgnored`
  - receipt-declared `task_agent_session_id`
  - receipt-declared `native_session_id`
- Bound receipt-declared sessions to the actual timeline task/native sessions.
- Persisted proof state into the replay repair timeline ledger:
  - usage state and reason
  - current-source verification
  - memory receipt match
  - receipt task/native session IDs
  - task/native session match results
  - receipt gaps
  - final `post_compact_reinjection_receipt_verified`
- Added a strict closure path requiring all five timeline events:
  - `dispatch`
  - `child_agent_start`
  - `worker_handoff_ready`
  - `task_agent_memory_context_snapshot`
  - `child_agent_receipt`
- A post-compact reinjection repair work item now closes only when:
  - the exact brief/work item is consumed through `replayRepairDispatchBriefUsage`
  - the exact gate/candidate is classified
  - memory usage or ignore evidence matches
  - task/native sessions match
  - packet, handoff, snapshot, and execution bindings exist
- Persisted closure proof on the work item:
  - `completion_source=post_compact_reinjection_replay_repair_receipt_consumption`
  - `resolutionReason=post_compact_reinjection_repair_receipt_verified`
  - `post_compact_reinjection_repair_receipt`
- Added quality check:
  - `post_compact_reinjection_repair_receipt_consumption`
- Added exported selftest:
  - `runMemoryCenterPostCompactReinjectionRepairReceiptConsumptionSelfTest`

## Negative And Positive Proof

The Phase 178 selftest first submits a receipt that:

- references the correct replay repair brief
- references the wrong post-compact candidate
- reports the wrong task/native sessions

The repair work item remains `pending`.

The selftest then submits a receipt on the same timeline that:

- references the exact brief and work item
- references the exact reinjection gate and candidate
- declares `usageState=verified`
- declares `currentSourceVerified=true`
- cites the gate/candidate in `memoryUsed`
- matches the actual task/native sessions

Only the second receipt closes the repair work item.

## Verification

TypeScript compile:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Phase 178 result:

```json
{
  "status": "ok",
  "coverageRate": 100,
  "expectedReceiptCount": 1,
  "coveredReceiptCount": 1,
  "timelineBindingCount": 1,
  "receiptVerifiedCount": 1,
  "completedRepairCount": 1,
  "metadataGapCount": 0
}
```

Focused regression:

```json
{
  "phase178": true,
  "phase177": true,
  "phase176": true,
  "readPlanWorkItems": true,
  "replayRepairPlan": true,
  "replayRepairWorkItems": true,
  "replayDispatchCandidates": true,
  "postCompactDiscipline": true,
  "reinjectionProof": true,
  "nativeDispatchTimeline": true,
  "nativeReceiptConsumption": true,
  "providerRankingReceiptConsumption": true,
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

## Invariants

- Mentioning a replay repair brief is not enough to close a post-compact reinjection repair.
- A wrong candidate, wrong gate, wrong memory receipt, wrong task session, or wrong native session cannot satisfy closure.
- `used` and `verified` require current-source verification.
- `ignored` requires an explicit reason and matching `memoryIgnored` evidence.
- Provider switch execution history remains ranking evidence only, never authorization. Explicit provider switches still require fresh valid receipt/checksum/local authority/task compatibility.

## Next Direction

Distill verified post-compact reinjection repair completion into typed group memory and recall it in later child Agent sessions. This should prevent a repaired candidate from repeatedly reopening after later compaction while preserving the rule that stale repository facts must still be reverified.
