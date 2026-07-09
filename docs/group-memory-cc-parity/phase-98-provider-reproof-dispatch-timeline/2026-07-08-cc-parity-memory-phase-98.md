# Phase 98 - Provider Re-proof Dispatch Timeline

## 目标

Phase 97 已经把 provider re-proof candidate 物化成主 Agent 可领取/派发的 repair work item。本阶段继续补齐真实派发链路：让 `api_microcompact_native_apply_provider_reproof` 在主 Agent brief、assignment、WorkerContextPacket、timeline binding 中作为 native proof 任务被完整记录，同时保持 Phase 96 的关键语义：timeline 只能证明派发/回执链路完整，不能替代 provider strong proof。

## 本阶段增强

- 新增 native proof source family 识别：
  - `api_microcompact_native_apply_binding_repair`
  - `api_microcompact_native_apply_provider_reproof`
- `group-orchestrator` 的 replay repair brief 现在会把 provider re-proof 字段写进 native proof binding 文案。
- assignment 和 WorkerContextPacket 现在透传：
  - `provider_reproof_status`
  - `provider_reproof_reason`
  - `reproof_candidate_id`
  - `timeline_binding_id`
  - `original_work_item_id`
- timeline binding ledger 现在记录 provider re-proof 字段，并在 Memory Center timeline binding report 中参与 native proof binding 覆盖率。
- timeline closure 仍只自动关闭原始 `api_microcompact_native_apply_binding_repair` item，不会自动关闭 `api_microcompact_native_apply_provider_reproof` item。

## 行为语义

- Provider re-proof work item 可以进入主 Agent 的可派发 brief。
- 派发后 assignment 和 WorkerContextPacket 会带上 re-proof 元数据，子 Agent 不会只看到普通 replay repair 文案。
- timeline binding 可证明：
  - dispatch
  - child agent start
  - worker handoff
  - task-agent memory context snapshot
  - child receipt
- provider re-proof work item 的完成仍必须依赖 provider strong proof / closure re-proof report，不能由 timeline closure 直接完成。

## 自测

新增：

- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest`

覆盖：

- provider re-proof candidate 保留 re-proof 元数据。
- provider re-proof brief 使用 native proof contract，而不是普通 replay repair contract。
- dispatch brief report 覆盖 provider re-proof metadata。
- assignment binding report 覆盖 provider re-proof 字段。
- timeline binding report 覆盖 provider re-proof 字段与 required events。
- timeline binding 不会提前关闭 provider re-proof work item。

## 已验证

- `npm run build:backend`
- `npm run check`
- `npm run build`
- Phase 90-98 native proof repair 自测矩阵
- `runMemoryCenterApiMicrocompactNativeApplyProviderReproofDispatchTimelineSelfTest`

后续仍需继续补齐更上层的长期目标：把这些 native proof / re-proof 结果进一步汇入长期记忆蒸馏、跨群召回、ignore-memory 语义与多会话 child Agent 稳定注入审计。
