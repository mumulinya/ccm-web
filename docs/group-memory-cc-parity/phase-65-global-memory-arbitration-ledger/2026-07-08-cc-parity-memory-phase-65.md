# Phase 65 - Global Memory Arbitration Ledger

## Objective

Continue CCM memory toward Claude Code parity by making Global Agent versus group memory arbitration persistent, auditable, and ready for later typed memory distillation.

Phase 62 added runtime arbitration so stale Global Agent memory could be demoted when newer group evidence exists. Phase 65 turns those arbitration outcomes into a group-scoped ledger instead of leaving them only inside one rendered child Agent context packet.

## Behavior

When `buildAgentMemoryContextBundle` recalls Global Agent memory for a project child Agent, any recalled item with arbitration status other than active global context is now recorded in:

- `group-global-memory-arbitration/<groupId>.json`

The ledger records:

- global memory id and type
- target project
- arbitration status, authority, and action
- whether the item was demoted or conflicted
- decisive group evidence and message ids
- compact global text and local rule text
- occurrence count for repeated conflicts
- distillation candidates for repeated conflicts

Repeated conflicts are merged by global memory id, target project, status, and decisive group message ids. This makes repeated stale global facts visible as durable evidence instead of producing duplicate one-off rows.

## Child Context

The child Agent memory bundle now includes:

- `global_memory_arbitration_ledger`
- `raw_sources.group_global_memory_arbitration_ledger_file`
- a rendered line describing the arbitration ledger and repeated conflict count

When a ledger exists, it is also tracked by:

- source manifest entry `global_memory_arbitration_ledger`
- compact file reference type `global_memory_arbitration_ledger`
- compact file reference read plan action `read_for_global_group_memory_conflict_history`

The read plan priority is high enough that conflict history appears when it matters, but it is not emitted when no arbitration ledger exists.

## Memory Center

`child_global_agent_memory_bridge` report rows now include:

- `sourceManifestHasArbitrationLedger`
- `compactReferencesHasArbitrationLedger`
- `arbitrationLedgerRequired`
- `arbitrationLedgerRecorded`
- `arbitrationLedgerFile`
- `arbitrationLedgerEntryCount`
- `arbitrationLedgerRepeatedConflictCount`
- `arbitrationDistillationCandidateCount`

Added a targeted quality check:

- `global_memory_arbitration_ledger`

It verifies that any Global Agent memory demotion/conflict is persisted to a group ledger and surfaced through source manifest plus compact file references.

## Verification

Passed on 2026-07-08:

- `npm run build:backend`
- `npm run check`
- `npm run test:chat-experience`
- `runGroupGlobalAgentMemoryArbitrationContextSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryArbitrationSelfTest`
- `runMemoryCenterChildGlobalAgentMemoryBridgeSelfTest`
- `runMemoryCenterQualityTargetedRefreshSelfTest`
- direct targeted `buildMemoryQualityReport({ checkIds: ["global_memory_arbitration_ledger"], cacheMaxAgeMs: 0 })`

The arbitration context self-test verified:

- stale global rule is recalled
- newer group evidence demotes/conflicts with it
- rendered child packet shows the arbitration rule and local evidence
- ledger is written
- repeated conflict is aggregated with `occurrenceCount: 2`
- source manifest tracks the ledger
- compact references track the ledger
- read plan can target the ledger
- a distillation candidate is produced

## Current Status

This phase strengthens the "memory can be recovered, scored, and evolved" part of the long-term goal.

Global Agent memory is no longer just injected or demoted in one packet. Its conflicts with group memory now become persistent, group-scoped evidence that Memory Center can score and that a future distillation job can convert into typed MEMORY.md rules.

The long-term Claude Code parity goal remains active.

## Next Upgrade Direction

- Add an automated distillation step that promotes repeated arbitration ledger candidates into typed MEMORY.md documents.
- Add cross-group duplicate suppression so the same stale Global Agent memory item is not repeatedly surfaced into unrelated child Agent packets.
- Add semantic contradiction detection beyond token overlap and simple newer-evidence heuristics.
- Add Memory Center UI rows for arbitration ledger entries and distillation candidates.
