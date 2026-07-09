# Phase 114 - WorkerContextPacket PTL Emergency Downgrade

## Goal

Close the loop between compact outcome strategy memory and prompt-too-long style emergency handling. Phase 113 taught WorkerContextPacket partial compact policy from historical outcomes, but repeated blocked compact outcomes still only produced strategy data. Phase 114 turns repeated failure into an explicit PTL emergency downgrade hint and applies it to the next WorkerContextPacket retry.

## What Changed

- Added a long-term sidecar under `~/.cc-connect/group-memory-worker-context-ptl-emergencies/`.
- Added schema identity `ccm-worker-context-ptl-emergency-hint-v1`.
- Repeated blocked compact outcomes now produce a PTL emergency hint.
- Trigger conditions are intentionally conservative:
  - two or more blocked compact outcomes,
  - task compaction attempted and still blocked,
  - or repeated failed metadata categories with no recovery.
- Critical hints provide stricter retry budgets:
  - shorter memory rendered/json budgets,
  - fewer replay repair briefs and shorter replay fields,
  - one metadata category with shorter strings,
  - shorter deterministic task compact budget.
- The group orchestrator now reads the PTL hint before retry and applies the downgraded budgets.
- `context_compaction_retry` carries `ptl_emergency_hint` when the downgrade is engaged.
- WorkerContextPacket rendering exposes `ptl_emergency_downgrade=...`.
- Outcome ledger rows preserve the PTL hint used by the retry.
- Memory Center now validates `worker_context_packet_ptl_emergency_downgrade`.

## Why It Matters

Claude Code-style prompt-too-long recovery is not just ordinary compaction. When normal compact attempts repeatedly fail, the system needs a stronger, explainable emergency mode. This phase makes repeated WorkerContextPacket failure actionable:

- outcome ledger records repeated blocked retries,
- strategy memory identifies failed categories,
- PTL emergency hint chooses a stricter retry budget,
- the next child Agent packet receives a visibly downgraded but still receipt-safe context.

## Recovery Contract

- PTL emergency does not bypass the pre-dispatch gate.
- If emergency compaction still leaves the packet over budget, dispatch remains blocked.
- Normal packets without repeated failure do not receive PTL hint text.
- Receipt/proof identifiers and ACK/verification contract remain preserved.
- PTL hint is derived from outcome/strategy sidecars; it is not a replacement for either.

## Validation

Passed:

- `npm run build:backend`
- `runWorkerContextPtlEmergencyDowngradeSelfTest`
- `runWorkerContextCompactStrategyMemorySelfTest`
- `runWorkerContextMetadataPartialCompactPolicySelfTest`
- `runMemoryCenterWorkerContextPacketPtlEmergencyDowngradeSelfTest`
- `runMemoryCenterWorkerContextPacketCompactStrategyMemorySelfTest`

Final validation for this phase should include:

- `npm run check`
- `npm run build`
- Re-run WorkerContextPacket compaction retry, partial compact, outcome ledger, strategy memory, and PTL emergency selftests from final dist.

## Follow-Up Direction

- Distill PTL emergency hints into typed MEMORY.md so long-running groups can recall recurring prompt-too-long patterns.
- Add ignore-memory semantics for intentionally memory-suppressed child sessions.
- Make PTL recovery explicit: when later outcomes recover consistently, downgrade hints should expire or be marked recovered.
