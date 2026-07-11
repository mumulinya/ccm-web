# Phase 155 - Cross-Group Provider Reliability Decay and Privacy

## Goal

Convert Phase 154 corrected-receipt validation attempts into time-aware provider reliability signals and make privacy-redacted aggregate guidance available across groups and to the global Agent.

Cross-group evidence may increase receipt sampling or recommend a safer provider, but it must never expose group-private memory and must never override the target group's local hold/allow policy.

## Implemented

- Added dynamic provider reliability scoring over the append-only Phase 154 archive.
- Default scoring parameters:
  - half-life: `14` days
  - passed receipt recovery credit: `1.25`
  - minimum actionable source groups: `2`
- Scoring preserves raw audit history while calculating current weighted values:
  - weighted failed score
  - weighted passed score
  - weighted evidence
  - risk score
  - confidence
- Recent failures therefore carry more dispatch weight than old failures followed by a recent verified repair.
- Added target-group-excluding signal builder:
  - `buildCrossGroupProviderDispatchReliabilitySignal(...)`
- Added global Agent aggregate builder:
  - `buildGlobalProviderDispatchReliabilitySignals(...)`
- Injected the sanitized aggregate into the global Agent's real `buildGlobalGroupMemoryContext(...)` context packet and rendered prompt.
- The global Agent context exposes only actionable provider-level scores and the explicit guidance/local-authority boundary.
- Global Agent `ignore memory` semantics suppress the reliability aggregate and its rendered text completely.
- Cross-group/global signal output includes only:
  - provider `agent_type`
  - risk status, score, and confidence
  - decayed aggregate attempt counts
  - source-group count, never source-group ids
  - actionability and recommendation
- Signal output explicitly enforces:
  - `guidance_only=true`
  - `local_policy_override_allowed=false`
  - `contains_private_memory=false`
- Signal output excludes:
  - group ids
  - project names
  - memory paths
  - validation/work-item/task/execution ids
  - receipt evidence and gap reasons
- Extended local pre-dispatch policy with:
  - dynamic local validation risk/confidence fields
  - sanitized cross-group guidance
  - a cross-group-only policy row when no local provider history exists
- Cross-group guidance is actionable only after minimum source/evidence thresholds are met.
- Local-first enforcement order:
  - local critical/relapsed/repeated-failure state remains authoritative
  - local repaired/monitor state remains authoritative
  - cross-group high/medium risk can only promote a healthy provider to monitored receipt sampling
  - cross-group guidance cannot create or clear `hold_until_repair`
- Explicitly disabling the pressure-provenance dispatch policy also suppresses cross-group reliability guidance.
- Extended WorkerContextPacket, pre-dispatch gate, and provider decision evidence with sanitized guidance.
- Added WorkerContextPacket acceptance flags:
  - `cross_group_provider_reliability_sampling_required`
  - `cross_group_provider_reliability_local_policy_override_allowed=false`
- Added Memory Center/global Agent report and quality check:
  - `worker_context_packet_cross_group_provider_reliability_guidance`
- Memory Center verifies decay fields, minimum source thresholds, privacy-safe keys, guidance-only behavior, and local-first invariants.
- Added global high-risk provider alerts containing only provider type and aggregate scores.
- Added selftests:
  - `runWorkerContextCrossGroupProviderReliabilityGuidanceSelfTest()`
  - `runMemoryCenterWorkerContextPacketCrossGroupProviderReliabilityGuidanceSelfTest()`

## Validation

- Backend type check without declaration emit: pass
  - `npx tsc -p backend/tsconfig.json --noEmit --declaration false`
- Backend runtime artifact compile without declaration emit: pass
  - `npx tsc -p backend/tsconfig.json --declaration false`
- Frontend build: pass
- MCP Feishu build: pass
- Phase 155 coordinator/gate privacy and local-first selftest: pass
- Phase 155 Memory Center/global guidance selftest: pass
- Global Agent context injection and ignore-memory suppression checks: pass
- Phase 137-155 plus global group-memory and core memory regression: 38/38 pass
- Formal `npm run check` / declaration build is currently blocked by an unrelated concurrent worktree change:
  - `backend/test-agent/contract/schema.ts(381,14)`
  - TypeScript `TS7056`: inferred schema type exceeds declaration serialization length
  - Phase 155 files pass the complete backend check when declaration generation is disabled

Decayed aggregate example:

```json
{
  "agent_type": "codex",
  "risk_status": "medium",
  "risk_score": 0.6155,
  "confidence": 0.6319,
  "source_group_count": 2,
  "half_life_days": 14,
  "guidance_only": true,
  "local_policy_override_allowed": false,
  "contains_private_memory": false
}
```

Cross-group-only dispatch result:

```json
{
  "action": "monitor_cross_group_provider_reliability_guidance",
  "dispatch_policy": "allow_with_receipt_sampling",
  "dispatch_ready": true,
  "provider_dispatch_hold": false
}
```

The same target group with two current local failures:

```json
{
  "action": "hold_provider_after_repeated_override_followup_receipt_validation_failures",
  "dispatch_policy": "hold_until_repair",
  "dispatch_ready": false,
  "provider_dispatch_hold": true
}
```

## Stable Memory

Raw corrected-receipt attempts remain private inside each group's typed-memory distillation ledger and MEMORY.md document. Cross-group and global consumers never receive those rows. They receive a freshly computed, time-decayed reliability signal containing only provider-level aggregate statistics.

Operational authority remains local-first. Cross-group evidence is guidance for sampling and provider preference, not permission to bypass a local hold and not authority to impose a hard hold on an otherwise healthy group. This keeps global Agent learning useful without leaking group content or collapsing multiple groups into one policy domain.

The score is dynamic rather than permanently stored as truth. Old failures decay according to the configured half-life, while append-only audit rows remain unchanged. A recent verified repair can lower current risk without erasing the historical failures that produced it.

## Next Direction

The next upgrade should persist a short-lived global reliability snapshot with checksum/TTL provenance, rank configured providers as sanitized safer alternatives, and inject the selected alternative guidance into the group main Agent's provider decision. Snapshot freshness and source-count confidence must be verified before use, and local group policy must remain the final authority.
