# CCM Group Memory CC Parity - Phase 180

Date: 2026-07-10

## Goal

证明 Phase 179 生成的 post-compact reinjection repair receipt typed MEMORY.md 不只是可搜索文档，而是会进入相关的新子 Agent 会话、渲染到 WorkerContextPacket，并要求该新会话提交自己的 memoryUsed/memoryIgnored 回执。

## Closed Gap

Phase 179 已把严格关闭的 repair receipt 蒸馏成 typed memory，但此前只证明：

- MEMORY.md 已生成
- exact gate/candidate/session/completion 已保存
- typed-memory recall probe 可以找到文档

这还不能证明第三方子 Agent 的新会话真正拿到记忆，也不能证明新会话不会直接复用历史 currentSourceVerified。

Phase 180 新增完整链路：

```text
typed repair receipt archive
  -> relevant-task recall summary
  -> repeatable typed MEMORY.md load plan
  -> fresh child session binding
  -> WorkerContextPacket memory usage contract
  -> self-contained handoff receipt instructions
  -> real assignment ledger contract persistence
  -> final child receipt attachment
  -> memoryUsed/memoryIgnored compliance report
```

## Relevant-Task Recall

File:

- `backend/modules/collaboration/memory.ts`

New recall schema:

- `ccm-post-compact-reinjection-repair-receipt-worker-context-recall-v1`

The recall activates when the current task matches:

- post-compact/reinjection/repair intent
- an archived reinjection gate id
- an archived candidate id
- an archived candidate value or source message

Unrelated tasks do not receive this dedicated contract.

For relevant tasks, the recall:

- appends exact candidate/gate terms to the typed-memory query
- marks receipt MEMORY.md documents as repeatable across new child sessions
- adds them to requiredRelPaths and the typed-memory load plan
- preserves historical task/native session ids as evidence
- records the newly surfaced relPaths for the current session

Supported documents:

- `post-compact-reinjection-repair-receipt-memory.md`
- `post-compact-reinjection-repair-receipt-cautions.md`

## WorkerContextPacket Contract

File:

- `backend/agents/runtime-kernel.ts`

New contract schema:

- `ccm-post-compact-reinjection-repair-receipt-memory-usage-contract-v1`

The contract is active only when the receipt memory is surfaced in the current child session.

It contains:

- required receipt MEMORY.md relPaths
- current child session binding id
- current task Agent session id
- current native session id
- historical reinjection gate ids
- historical candidate ids and values
- historical task/native session ids
- completion source and resolution metadata
- memoryUsed and memoryIgnored templates

Acceptance requirements:

- `post_compact_reinjection_repair_receipt_memory_usage_required=true`
- `post_compact_reinjection_repair_receipt_memory_current_source_reverification_required=true`
- `post_compact_reinjection_repair_receipt_memory_ignored_reason_required=true`

The contract has its own required context-usage category:

- `post_compact_reinjection_repair_receipt_memory_contract`

## Freshness And Receipt Rules

Every surfaced receipt MEMORY.md must appear in the new child Agent receipt.

Used or verified:

```text
memoryUsed:
  <doc relPath>;
  usageState=used|verified;
  currentSourceVerified=true;
  historical repair completion is recovery evidence, not permanent repository truth
```

Ignored:

```text
memoryIgnored:
  <doc relPath>;
  usageState=ignored;
  reason=<why it was not used>
```

The validator rejects:

- missing required document relPath
- used/verified without `currentSourceVerified=true`
- ignored without an explicit reason
- missing historical-evidence freshness boundary
- task Agent session mismatch
- native session mismatch

Historical session ids are never accepted as the current session proof.

## Handoff And Real Receipt Persistence

Files:

- `backend/agents/worker-handoff.ts`
- `backend/modules/collaboration/group-orchestrator.ts`

The self-contained worker handoff now renders the post-compact receipt memory contract and its receipt rules.

Replay-repair assignment binding now persists:

- WorkerContextPacket acceptance
- post-compact repair receipt memory contract
- provider ranking receipt memory contract

When `child_agent_receipt` arrives, the timeline path attaches the real receipt back to the matching assignment binding by brief/assignment/dispatch/packet identity.

This allows Memory Center to audit the actual dispatched packet and actual final receipt together.

Memory Center still does not create real child Agent tasks. Dispatch ownership remains with the group main Agent.

## Memory Center Quality Gates

File:

- `backend/modules/knowledge/memory-control-center.ts`

New checks:

- `post_compact_reinjection_repair_receipt_worker_context_recall`
- `post_compact_reinjection_repair_receipt_memory_usage_receipt`

The first check proves:

- two distinct fresh child session bindings both recall the memory
- recall-ledger surfacing does not suppress the second relevant session
- required docs enter typed-memory load plan
- both WorkerContextPackets render the docs and contract
- the contract is rebound to each new task/native session
- context usage counts the contract as required
- freshness and receipt rules are visible

The second check proves:

- assignment binding contains the contract
- final receipt is attached to the same binding
- every required doc is covered
- usage state is valid
- current-source verification or ignored reason is present
- freshness boundary is acknowledged
- task/native sessions match

New self-test:

- `runMemoryCenterPostCompactReinjectionRepairReceiptWorkerContextUsageSelfTest`

## Multi-Group Behavior

Archive, recall, contract, assignment binding and receipt audit remain scoped by groupId.

Two groups may hold the same candidate path without sharing:

- repair completion authority
- session binding
- receipt compliance
- current-source verification

Cross-group history can only be background evidence through existing arbitration rules.

## Verification

TypeScript:

```powershell
npx tsc -p backend/tsconfig.json --pretty false
```

Result: passed.

Phase 180 self-test:

- archive recall: passed
- two distinct fresh sessions: passed
- repeat recall after recall-ledger surfacing: passed
- WorkerContextPacket contract: passed
- assignment ledger contract persistence: passed
- real child receipt attachment: passed
- compliant fresh receipt accepted: passed
- stale/wrong-session receipt rejected: passed
- both Memory Center checks: passed

Combined regression: 25/25 passed.

Covered areas include:

- Phase 176-180
- typed group memory context
- post-compact first dispatch and candidate usage ledger
- replay repair plan/work items/candidates
- post-compact discipline and reinjection proof
- partial compact retry and policy
- provider re-proof typed memory
- provider ranking receipt consumption, typed memory, WorkerContext recall, usage contract and usage receipt
- runtime kernel and context usage
- self-contained worker handoff
- ignore-memory policy

`git diff --check` reports only existing LF-to-CRLF warnings.

## Invariants

- Historical repair completion is recovery evidence, not permanent repository truth.
- Every new child session must make its own memory usage decision.
- Used/verified recalled repair memory requires fresh current-source verification.
- Ignored recalled repair memory requires a reason.
- Current task/native session ids must not be replaced by historical session ids.
- Provider switch execution history remains ranking evidence only, never authorization.
- Memory Center diagnostics never create real child Agent tasks.

## Next Audit Direction

Phase 181 should materialize noncompliant post-compact repair receipt memory usage as repair work items and corrected-receipt dispatch briefs.

It should also suppress duplicate repair reopening only when:

- the same group, packet, required docs and receipt gap identity match
- a corrected receipt covers all required docs
- current task/native sessions match
- current-source verification is fresh

This will turn Phase 180 detection into an operational repair-and-close loop.
