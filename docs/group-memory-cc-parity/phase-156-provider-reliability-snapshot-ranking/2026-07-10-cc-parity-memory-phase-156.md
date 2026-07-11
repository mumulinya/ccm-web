# Phase 156 - Provider Reliability Snapshot and Ranking

## Goal

Turn Phase 155 privacy-redacted provider reliability signals into a short-lived, verifiable snapshot and use only a fresh snapshot to rank explicitly configured same-project runners.

The snapshot is a cache, not a source of truth. Ranking may advise the group main Agent about a safer runner for a future dispatch decision, but it must never auto-switch the current assignment or bypass the group's local provider gate.

## Implemented

- Added global snapshot protocol:
  - schema: `ccm-global-provider-dispatch-reliability-snapshot-v1`
  - default TTL: 15 minutes
  - atomic write with backup
- Snapshot identity and provenance:
  - snapshot id
  - generation id
  - generated/expires timestamps
  - payload checksum
  - full snapshot checksum
  - source-generation checksum
  - source ledger/attempt counts without source ids
- Added snapshot APIs:
  - `writeGlobalProviderDispatchReliabilitySnapshot(...)`
  - `readGlobalProviderDispatchReliabilitySnapshot(...)`
  - `getOrRefreshGlobalProviderDispatchReliabilitySnapshot(...)`
  - `getGlobalProviderDispatchReliabilitySnapshotFile(...)`
- Snapshot validation states:
  - `fresh`
  - `expired`
  - `tampered`
  - `stale_source_generation`
  - `missing`
- Snapshot use is rejected when:
  - TTL expired
  - payload checksum mismatches
  - snapshot checksum mismatches
  - source typed-memory generation changed
  - privacy/local-authority flags are invalid
- Stale or missing snapshots can be atomically refreshed and revalidated.
- Global Agent group-memory context now uses the verified snapshot instead of rebuilding an unversioned aggregate directly.
- Global Agent context renders snapshot id, generation, expiry, checksum, and sanitized provider-level guidance.
- `ignore memory` still exits before snapshot creation or injection.
- Added explicit provider candidate discovery from:
  - coordinator options
  - configured provider candidates
  - matching group member provider/alternative-agent lists
- Candidate safety boundary:
  - candidate must be explicitly configured
  - candidate must target the same project
  - disabled/unconfigured candidates are ignored
  - another project's runner is never treated as an alternative
- Candidate ranking combines:
  - local provider health
  - local dispatch policy
  - fresh global risk status/score/confidence
- Only candidates with a lower composite risk than the selected runner are exposed as safer alternatives.
- Ranking output carries the snapshot id/checksum used for the comparison.
- Advisory and decision ledger now persist:
  - snapshot reference
  - safer alternatives
  - selected runner remains unchanged
  - `auto_switch_provider_allowed=false`
- WorkerContextPacket renders:
  - snapshot freshness/provenance
  - configured safer alternatives
  - explicit current-assignment-unchanged rule
- Added acceptance requirements:
  - `provider_reliability_snapshot_fresh_required`
  - `provider_reliability_safer_alternative_review_required`
  - `provider_reliability_safer_alternative_auto_switch_allowed=false`
- Added Memory Center report/check:
  - `worker_context_packet_provider_reliability_snapshot_ranking`
- Memory Center verifies snapshot freshness/integrity, binding snapshot match, candidate configuration/project scope, no-auto-switch behavior, and local-first hold behavior.
- Added selftests:
  - `runWorkerContextProviderReliabilitySnapshotRankingSelfTest()`
  - `runMemoryCenterWorkerContextPacketProviderReliabilitySnapshotRankingSelfTest()`

## Validation

- Backend type check without declaration emit: pass
  - `npx tsc -p backend/tsconfig.json --noEmit --declaration false`
- Backend artifact compile without declaration emit: pass
  - `npx tsc -p backend/tsconfig.json --declaration false`
- Phase 156 snapshot/freshness/ranking selftest: pass
- Phase 156 Memory Center snapshot/binding quality selftest: pass
- Phase 137-156 plus global group-memory and core memory regression: 40/40 pass
- When no snapshot/candidate is enabled, Phase 156 adds no empty packet fields and preserves previous context-budget behavior.
- Fresh report:
  - status `ok`
  - checked/passed `2/2`
  - snapshot `fresh`
  - one configured safer alternative
- Tampered report:
  - status `fail`
  - checked/passed `0/2`
  - snapshot `tampered`
- Formal declaration build remains subject to the unrelated shared-worktree `backend/test-agent/contract/schema.ts(381,14)` TS7056 issue until that concurrent change is stabilized.

Fresh snapshot example:

```json
{
  "status": "fresh",
  "snapshot_id": "provider-reliability-snapshot:...",
  "generation_id": "provider-reliability-generation:...",
  "expires_at": "2026-07-10T08:05:00.000Z",
  "snapshot_checksum": "...",
  "source_generation_matches": true
}
```

Ranked advisory example:

```json
{
  "selected_candidate": {
    "agent_type": "codex"
  },
  "safer_alternatives": [
    {
      "agent_type": "cursor",
      "project": "api",
      "configured": true,
      "global_risk_status": "low",
      "safer_than_selected": true
    }
  ],
  "auto_switch_provider_allowed": false
}
```

## Stable Memory

Provider reliability snapshots are disposable verified views over append-only typed-memory evidence. The typed-memory ledgers remain authoritative; a snapshot becomes unusable as soon as its TTL expires, its checksums fail, or its source generation no longer matches.

Safer alternatives are advisory and configuration-bound. CCM does not infer alternatives from unrelated group members, does not route work to another project, and does not silently replace the selected runner. The group main Agent must make a new explicit provider decision using current task compatibility and local policy.

Local policy remains final. A fresh snapshot may help rank alternatives, but an active local hold still blocks the selected assignment. The existence of a safer candidate does not turn a blocked dispatch into a successful dispatch.

## Next Direction

The next upgrade should add an explicit provider-switch decision receipt. When the group main Agent chooses a ranked alternative, the receipt should bind the old/new runner, snapshot id/checksum, task compatibility evidence, user/local policy authority, and the resulting child-Agent session. The final child receipt must prove which provider actually executed the task so ranking advice cannot be mistaken for an applied switch.
