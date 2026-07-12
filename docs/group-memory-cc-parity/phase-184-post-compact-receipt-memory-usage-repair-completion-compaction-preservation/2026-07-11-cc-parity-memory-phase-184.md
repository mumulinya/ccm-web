# CCM Group Memory CC Parity - Phase 184

Date: 2026-07-11

## Goal

保证 Phase 183 completion-memory 使用合同经过 WorkerContextPacket memory-first retry、replay-brief partial compact、metadata partial compact、PTL emergency downgrade 和内存重注入后仍完整，且历史 original/repair session 永远不能升级为当前 authority。

## Closed Gap

此前 retry 只保存：

```text
preserved_receipt_contract=true
```

这个布尔值不能证明以下字段实际存在于压缩后的 packet：

- completion MEMORY.md relPath
- required receipt docs
- completion work item ids
- completion timeline binding ids
- current session binding
- current task Agent session
- current native session
- historical original/repair sessions
- receipt acceptance requirements

Phase 184 新增结构化 preservation proof，并让 pre-dispatch gate 拒绝 proof 缺失或不完整的 retry packet。

## Preservation Proof

File:

- `backend/modules/collaboration/group-orchestrator.ts`

New schemas:

- `ccm-post-compact-receipt-memory-usage-repair-completion-packet-summary-v1`
- `ccm-post-compact-receipt-memory-usage-repair-completion-preservation-v1`

The before/after packet summaries preserve:

- completion contract presence
- completion and required doc relPaths
- completion work item ids
- completion timeline binding ids
- historical task Agent session ids
- historical native session ids
- current session binding id
- current task Agent session id
- current native session id
- memory usage acceptance requirement
- current-session acceptance requirement
- authority-boundary validation

The proof rejects:

- missing completion contract
- missing completion or required docs
- missing work-item or timeline identity
- missing historical session evidence
- changed current binding or session ids
- missing receipt acceptance fields
- current session promoted from a historical original/repair session

## Retry Paths

The preservation proof is generated for:

- memory-first deterministic context compaction
- replay repair brief partial compact
- metadata partial compact
- final task head/tail compact
- PTL emergency downgrade

The proof is attached only when the original packet actually contains completion memory. Ordinary retry packets do not receive an unnecessary proof payload, preserving their previous token footprint.

## Pre-Dispatch Gate

File:

- `backend/modules/collaboration/group-orchestrator.ts`

The gate now evaluates:

- `completion_memory_preservation_blocked`
- `completion_memory_preservation`

When a required proof has `preserved=false`, dispatch is blocked even if the retry packet is otherwise inside the token budget.

The adversarial self-test removes completion docs, work-item/timeline ids, and replaces the current session with a historical session. The proof detects all changes and the gate refuses dispatch.

## Outcome Ledger

Files:

- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/knowledge/memory-control-center.ts`

Compact hook and outcome ledgers now persist:

- preservation required/preserved state
- complete before/after proof
- missing-field gaps
- completion doc relPaths
- work-item and timeline ids
- current task/native sessions
- authority-boundary result

The general compact outcome report also exposes completion preservation counts and exact identity fields.

## Runtime Rendering

File:

- `backend/agents/runtime-kernel.ts`

Rendered retry context includes:

```text
completion_memory_preservation=true|false
required=true|false
gaps=<codes>|none
```

This keeps the preservation result visible to handoff diagnostics and packet render probes after compaction.

## Memory Center Quality Gate

File:

- `backend/modules/knowledge/memory-control-center.ts`

New check:

- `post_compact_reinjection_repair_receipt_memory_usage_repair_completion_compaction_preservation`

New self-tests:

- `runWorkerContextCompletionMemoryCompactionPreservationSelfTest`
- `runMemoryCenterPostCompactReceiptMemoryUsageRepairCompletionCompactionPreservationSelfTest`

The orchestrator self-test runs four real retry strategies:

- memory-first compaction with memory reinjection hash verification
- replay-brief partial compact
- metadata partial compact
- PTL emergency task downgrade

The memory-first case intentionally remains blocked by an extremely small token budget, while still proving that the completion contract and memory reinjection hash survive. Replay partial, metadata partial and PTL recover and become dispatch-ready.

The Memory Center self-test writes four persisted outcome rows and verifies:

- four required preservation proofs
- four preserved proofs
- one row for each strategy
- exact completion doc/work-item/timeline identity
- exact current task/native session
- valid historical-session authority boundary
- registered quality check passes 4/4

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Orchestrator strategy self-test: 8/8 checks passed.

Memory Center self-test: 4/4 checks passed.

Combined regression: 37/37 passed.

Covered areas include:

- Phase 176-184
- memory-first compaction and reinjection proof
- replay and metadata partial compact
- PTL emergency downgrade
- compact outcome ledger
- post-compact recall and typed-memory scoring
- context usage repair
- ignore-memory policy
- provider ranking receipt and authorization boundary
- runtime kernel and context usage

`git diff --check` reports only existing LF-to-CRLF warnings.

## Invariants

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every new child session makes its own memory usage decision.
- Used or verified recalled memory requires current-source verification.
- Ignored recalled memory requires an explicit reason.
- Historical original and repair sessions cannot authorize current work.
- A compact retry cannot dispatch when required completion-memory preservation fails.
- Provider switch execution history is ranking evidence only, never authorization.
- Memory Center diagnostics never create real child Agent tasks.

## Next Audit Direction

Phase 185 should convert blocked or failed completion-memory preservation proofs into idempotent repair work items, main-Agent dispatch candidates and self-contained repair briefs.

The repair loop must preserve exact before/after proof gaps, never create a real child task from Memory Center, and close only after a corrected retry packet restores every completion identity and current-session boundary.
