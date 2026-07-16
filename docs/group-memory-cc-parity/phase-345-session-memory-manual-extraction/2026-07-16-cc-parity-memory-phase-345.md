# CCM Memory Phase 345: Manual Exact-Session Memory Extraction

Date: 2026-07-16

## Goal

Expose Claude Code-style manual Session Memory extraction in Memory Center without weakening CCM's exact-session isolation, extraction leases, safe cursor advancement, or Global Agent boundary.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code's `manuallyExtractSessionMemory(messages, toolUseContext)` bypasses the automatic extraction threshold for `/summary`, rejects an empty message list, runs the existing isolated extraction path, and updates its extraction baseline only after success.

## Previous Gap

CCM already had the production model extraction executor and its complete safety chain:

- exact `group + gcs_*` transcript loading;
- automatic cadence and bounded structured transcript selection;
- forked third-party Agent execution;
- per-session lease, heartbeat, fencing token, staged commit, failure backoff, and receipts;
- merge-quality verification, safe cursor advancement, replay artifacts, typed-memory distillation, and delivery evidence.

Memory Center could retry a failed typed-memory artifact commit, but it could not request a fresh model extraction for the selected conversation. The existing retry does not invoke a model and therefore is not equivalent to Claude Code's manual extraction.

## Implementation

`runGroupSessionMemoryModelExtractionNow()` now recognizes an explicit manual trigger. Manual mode:

- bypasses cadence thresholds through the existing `force` contract;
- rejects a completely empty transcript with `manual_extraction_empty_transcript`;
- rejects a session with no messages after the committed safe cursor with `manual_extraction_no_new_messages`;
- continues to use the normal structured input budget, tool boundary checks, model executor, merge-quality gate, lease/fencing transaction, staged snapshot commit, and safe cursor resolution;
- records `trigger=manual`, a manual reason, and `manual_forked_model_session_memory` transaction mode in durable evidence.

The Memory Center operation `extract_session_memory_now` accepts only an existing exact `group::gcs_*` scope. Group-only, legacy default, project, and Global Agent scopes fail closed. Manual execution requires explicit confirmation and bypasses failure backoff, while an active extraction lease still returns a conflict instead of launching a duplicate model call.

The per-session Memory Center row now has an icon-backed `立即抽取` action. It shows an extraction running state, disables duplicate clicks and already-running rows, refreshes fleet evidence after success, and translates empty/no-new/executor-unavailable failures into actionable messages.

## Isolation

The operation resolves the selected Memory Center scope back to the fleet's canonical `groupId`, `groupSessionId`, and `modelExtractionScopeId` before invocation. It never accepts a group-only fallback or active-session inference.

Sibling `gcs_*` snapshots are unchanged. Global Agent cannot invoke this operation and still receives only global memory context; group Session Memory bodies and extraction artifacts are not added to its prompt path.

## Verification

Dedicated restart test:

```text
PHASE345_RESULT={"checks":15,"passed":15}
```

Coverage includes a real configured executor, threshold bypass, signed manual receipt, empty transcript rejection, no-new-message rejection, group-only rejection, Global Agent rejection, sibling-session immutability, concurrent lease exclusion, safe cursor advancement, fresh-process receipt verification, Memory Center running state, exact scope binding, Global Agent body exclusion, and legacy-default absence.

Adjacent regressions:

```text
Phase 344 template-empty compact fallback: 17/17
Phase 343 custom template: 20/20
Phase 342 custom prompt: 17/17
Base model extraction: 12/12
```

Release verification:

```text
npm run build: passed
npm run check: passed
npm run docs:check: 330 parity documents, 1024 links, 0 failures
desktop 1280x720: exact-session action visible, no horizontal overflow, 0 console errors
mobile 390x844: action visible and in bounds, no horizontal overflow, 0 console errors
temporary runtime scope: deleted after verification
```

## Later Evolution

Phase 347 supersedes Phase 345's `manual_extraction_no_new_messages` behavior. Direct comparison with Claude Code showed that manual `/summary` accepts any non-empty current conversation and can intentionally refresh Session Memory when the safe cursor is already at the tail. Automatic extraction remains incremental.

## Result

The original CCM memory workflow remains functionally complete, and operators can now refresh one selected group conversation's Session Memory on demand using the same trusted extraction path as automatic updates. This closes the identified Claude Code `/summary` manual-extraction parity gap without broadening any memory scope.
