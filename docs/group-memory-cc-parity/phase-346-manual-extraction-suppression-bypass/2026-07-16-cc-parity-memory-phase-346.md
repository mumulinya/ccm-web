# CCM Memory Phase 346: Manual Extraction Suppression Bypass

Date: 2026-07-16

## Goal

Guarantee that Memory Center's manual Session Memory extraction actually invokes the isolated model executor, even when the new exact-session transcript contains committed direct-memory writes that would correctly suppress an automatic extraction.

## Claude Code Evidence

Reviewed:

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

Claude Code's `manuallyExtractSessionMemory()` rejects an empty message list and then unconditionally runs `runForkedAgent()` with the manual Session Memory label. It does not apply an automatic no-model optimization to `/summary`.

## Previous Gap

CCM's automatic Session Memory path can safely skip a model call when every new memory-relevant message is already represented by committed, exact-session direct-memory receipts. That optimization advances the safe cursor under a signed suppression receipt and avoids redundant work.

Phase 345 reused the same extraction function for manual execution. Because the suppression check ran before the model executor, a user could click `立即抽取`, receive a success response, and still get `direct_memory_write_suppressed` without a fresh model extraction. The behavior was valid for automatic cadence but contradicted the manual command's user contract and Claude Code behavior.

## Implementation

Manual extraction now disables direct-memory model suppression inside the shared extraction function. Automatic extraction remains unchanged.

When eligible direct-memory proof exists during a manual run, the request audit and v2 extraction receipt bind body-free evidence:

- `directMemorySuppressionEligible`
- `directMemorySuppressionBypassedForManualExtraction`
- `directMemoryProofCount`
- `directMemoryChecksum`
- `directMemoryLedgerMutationFence`

The receipt also binds `trigger` and `modelInvoked`. Committed v2 receipts are invalid unless `modelInvoked=true`. A manual bypass is invalid unless it is manual, suppression was eligible, at least one proof existed, the direct-memory checksum is well formed, and the ledger mutation fence is positive. Historical v1 receipts remain checksum-compatible.

The extraction result now reports `modelInvoked` on success, model failure, lease rejection, input-budget rejection, empty transcript, no-new-message, and executor-unavailable paths. Memory Center accepts manual success only when both `committed=true` and `modelInvoked=true`; a future regression therefore fails with `manual_extraction_model_not_invoked` instead of displaying false success.

## Visibility And Isolation

Memory Center fleet rows expose the latest receipt version, trigger, model-invoked status, manual suppression eligibility, bypass status, and proof count. Fleet counters distinguish total manual extractions, manual model invocations, eligible direct-write cases, and completed manual bypasses.

The action tooltip now states that it bypasses both automatic cadence and automatic suppression to call the model. Sibling `gcs_*` snapshots remain unchanged. Global Agent remains outside the operation and receives no group Session Memory or direct-memory proof body.

## Verification

Dedicated restart test:

```text
PHASE346_RESULT={"checks":16,"passed":16}
```

Coverage includes automatic suppression preservation, actual manual executor invocation through the Memory Center API, signed v2 bypass evidence, body-free proof binding, semantic tamper rejection after checksum recomputation, v1 compatibility, history-chain evidence, safe cursor advancement, fresh-process receipt verification, fleet visibility, sibling isolation, API false-success rejection, UI semantics, Global Agent exclusion, and legacy-default absence.

Adjacent regressions completed before release verification:

```text
Phase 345 manual extraction: 15/15
Phase 274 direct-write suppression: 13/13
Base model extraction: 12/12
```

Release verification:

```text
npm run build: passed
npm run check: passed
npm run docs:check: 331 parity documents, 1025 links, 0 failures
desktop 1280x720: manual bypass fleet card and explicit model-invocation action visible, no horizontal overflow, 0 console errors
mobile 390x844: card and action in bounds, no horizontal overflow, 0 console errors
```

## Later Evolution

Phase 347 upgrades new model extraction receipts from v2 to v3 to bind whether the model received a full-session manual refresh or an automatic range after the safe cursor. Historical v1 and v2 receipts remain valid.

## Result

Automatic extraction still avoids redundant model work when durable direct-memory receipts are sufficient. A user-requested extraction now has a stronger contract: success proves that the selected exact-session transcript was processed by the model executor, committed under the normal lease and cursor safety gates, and remained isolated from sibling and Global Agent memory scopes.
