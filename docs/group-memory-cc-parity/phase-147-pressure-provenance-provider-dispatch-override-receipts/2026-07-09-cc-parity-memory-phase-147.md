# Phase 147: Pressure Provenance Provider Dispatch Override Receipts

## Goal

Phase 146 已经把主 Agent 的 provider 派发决策写入 binding ledger。Phase 147 给 `hold_until_repair` 增加严格的结构化 override receipt：默认仍然阻断风险 provider；只有用户明确批准、接受风险、承认后续 repair/recovery 仍然必须完成时，主 Agent 才能一次性放行第三方子 Agent 会话，并把这个 override 作为可审计记忆证据写入 ledger 与 Memory Center。

## Implemented

- 新增 provider override receipt schema：
  - `ccm-pressure-provenance-provider-dispatch-override-receipt-v1`
- `buildAssignment` 支持从 member/options 接收：
  - `providerDispatchOverride`
  - `provider_dispatch_override`
  - `pressureProvenanceProviderDispatchOverride`
  - `pressure_provenance_provider_dispatch_override`
- pre-dispatch gate 新增字段：
  - `provider_dispatch_hold_blocked`
  - `provider_dispatch_hold_overridden`
  - `provider_dispatch_override_receipt`
  - `provider_dispatch_override_required_followup_repair`
- 有效 override 必须满足：
  - schema 合法
  - `approved=true`
  - `risk_accepted=true`
  - `acknowledges_repair_required=true`
  - `approved_by` 非空
  - `reason` 非空
  - project / agent_type 如果声明则必须匹配当前 provider
  - `override_action` 为 `allow_once` / `allow` / `force_dispatch`
  - `expires_at` 如果声明则必须未过期
- provider decision 新增 action：
  - `dispatch_with_provider_override`
- provider decision 现在记录：
  - `provider_dispatch_hold_overridden`
  - `requires_repair_followup`
  - `provider_dispatch_override_receipt`
- binding ledger 新增：
  - `worker_context_provider_dispatch_override_receipt`
  - `providerDispatchOverrideDecisionCount`
- Memory Center decision ledger 审计现在能识别：
  - `dispatch_with_provider_override`
- Memory Center 新增 report/check：
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_receipts`
- overview alerts 会在 override receipt 不合规时暴露：
  - `worker_context_packet_pressure_provenance_provider_dispatch_override_receipts`
- 新增自测：
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest`

## Validation

- `npm run check`: PASS
- `npm run build:backend`: PASS
- `npm run build`: PASS
- Final dist regression set：PASS
  - `runWorkerContextPressureProvenanceProviderDispatchOverrideReceiptSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchOverrideReceiptSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceProviderDispatchDecisionLedgerSelfTest`
  - `runWorkerContextPressureProvenanceProviderDispatchGateSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackProviderDispatchAdvisorySelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackComplianceHealthSelfTest`
  - `runMemoryCenterWorkerContextPacketPressureProvenanceFeedbackPolicyRepairWorkItemsSelfTest`
  - `runWorkerContextPreDispatchGateSelfTest`
  - `runWorkerContextIgnoreMemoryPolicySelfTest`
  - `runWorkerContextCompactionRetrySelfTest`
  - `runAgentRuntimeKernelSelfTest`
  - `runWorkerContextUsageSelfTest`
  - `runWorkerHandoffSelfTest`

## Stable Memory

Phase 147 makes provider override safe enough to audit. A risky runner can no longer be silently forced through a pressure provenance hold. If override is invalid, the decision remains `hold_until_repair` and the receipt records gaps such as `risk_accepted` or `acknowledges_repair_required`. If override is valid, the decision becomes `dispatch_with_provider_override`, `should_create_real_task=true`, and `requires_repair_followup=true`.

The critical behavior is:

1. Default behavior is still strict hold for critical pressure provenance providers.
2. Invalid override receipts do not bypass the hold.
3. Valid override receipts can allow a one-time dispatch while preserving the risk evidence.
4. Binding ledger records both the override receipt and the resulting provider decision.
5. Memory Center checks that override dispatches include explicit user approval, risk acceptance, repair acknowledgement, reason, and gate/decision consistency.

This brings CCM closer to Claude Code-style memory control: memory-derived safety gates can be overridden only with structured, durable user intent, and the override itself becomes future recall/audit evidence.

## Next Direction

- Distill repeated provider override decisions into typed MEMORY.md entries so future tasks can recall risky override history without reading raw ledgers.
- Add Group Chat / Memory Center UI display for override status, approver, reason, and follow-up repair requirement.
- Bind override receipts to actual child-agent completion receipts so post-dispatch compliance can confirm the override run produced stronger provenance.
- Add expiration / one-time consumption semantics so `allow_once` receipts cannot be reused across unrelated assignments.
- Connect override follow-up repair to repair work item lifecycle, closing the loop after a risky provider run is corrected.
