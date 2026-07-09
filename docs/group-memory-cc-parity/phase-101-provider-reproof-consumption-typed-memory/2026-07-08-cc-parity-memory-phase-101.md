# CCM Group Memory CC Parity - Phase 101

## Topic

Provider re-proof receipt consumption typed-memory distillation.

## Goal

把 Phase 100 已经落盘的 `replayRepairDispatchBriefUsage` 回执消费结果继续蒸馏进群聊 typed `MEMORY.md`，让后续每一次第三方项目子 Agent 新会话都能召回：

- 子 Agent 确认使用、核验、或声称 strong 的 provider re-proof brief。
- 子 Agent 忽略或阻塞的 provider re-proof brief，作为 feedback/caution memory，而不是高优先级上下文。
- `strong` 回执只代表子 Agent 的消费声明，不等于 native provider strong proof，仍必须用 provider proof/request telemetry ledger 关闭。

## Implementation

- `backend/modules/collaboration/group-memory-index.ts`
  - Added `distillProviderReproofReceiptConsumptionToTypedMemory`.
  - Writes `provider-reproof-receipt-consumption-recall.md` as `reference` memory for `used | verified | strong`.
  - Writes `provider-reproof-receipt-consumption-cautions.md` as `feedback` memory for `ignored | blocked`.
  - Persists rows in `.distillation-ledger.json` under `providerReproofReceiptConsumptionArchive`.
  - Preserves the archive when normal group-log typed-memory distillation runs later.
  - Added `forceMemory` recall option for internal probes so self-checks do not accidentally trigger user "ignore memory" semantics.

- `backend/modules/collaboration/group-orchestrator.ts`
  - `recordReplayRepairDispatchBriefTimelineBinding` now auto-distills provider re-proof receipt consumption when a valid consumption status is recorded.

- `backend/modules/knowledge/memory-control-center.ts`
  - Added report/check `api_microcompact_native_apply_provider_reproof_receipt_consumption_typed_memory`.
  - Report validates archive coverage, promoted/reference docs, feedback/caution docs, recall probe coverage, and strong-claim warning text.
  - Overview now exposes the report and raises alerts for weak groups.

## Selftests

- `runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest`
  - Proves idempotent archive merge.
  - Proves promoted rows become reference memory.
  - Proves ignored rows become feedback memory.
  - Proves strong receipt claim is marked as claim-only.

- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemorySelfTest`
  - Proves timeline receipt auto-distills typed memory.
  - Proves Memory Center report reaches `ok`.
  - Proves quality check reaches `ok`.
  - Proves recall probe can retrieve the generated provider re-proof typed memory.

## Validation

Passed:

- `npm run build:backend`
- `npm run check`
- `runGroupTypedMemoryProviderReproofReceiptConsumptionDistillationSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofReceiptConsumptionTypedMemorySelfTest`

Full package build is still expected after this phase so `ccm-package/dist` and `ccm-package/public` remain synchronized.

## Stable Memory

Provider re-proof receipt consumption is now a typed-memory source, not only a Memory Center audit artifact. When a child Agent consumes a provider re-proof brief, CCM stores the outcome in group typed memory so the next fresh child Agent session can receive it through the existing `MEMORY.md` recall path. Ignored/blocked provider re-proof rows are deliberately stored as feedback/caution memory so stale repair briefs do not get promoted back into high-priority context.
