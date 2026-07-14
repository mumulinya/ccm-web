# 全局 Mission 强验收门禁 v1

日期：2026-07-09

## 背景

全局主 Agent 会把一个需求拆成多个群聊主 Agent 或项目 Agent 子任务，再由父任务汇总进展。之前父任务汇总仍可能把 `status=done` 加 `acceptance_gate_passed=true` 的子任务算成完成，即使它只有“验收结论：已通过”这类弱结论，没有真实验证或复核证据。

这会让用户在全局文本框或监工总结里看到过早的“已完成”。

## 改动

- `backend/modules/collaboration/global-mission.ts`
  - 新增 `hasStrongGlobalMissionChildAcceptanceEvidence`。
  - 子任务通过必须具备强验收证据：真实验证、外部 Runner 证据、实质验收门禁、独立复核证据或非空的具体验收说明。
  - `getGlobalMissionChildDeliveryEvidence` 现在输出：
    - `strong_acceptance_passed`
    - `acceptance_evidence_status`
    - `acceptance_evidence_detail`
  - 父任务的 `completed_count`、`passed_count`、`all_passed` 只统计强验收通过的子任务。
  - 弱验收的 done 子任务会显示为 `reviewing`，父任务保持 `in_progress`。

- `backend/agents/global/mission-supervisor.ts`
  - 全局监工最终报告不再只看父任务 `acceptance_gate_passed`。
  - 必须确认每个子任务行 `gate_passed=true` 且不是弱/缺失验收，才会发完成总结。
  - 弱验收子任务会进入遗留项：等待真实验证或复核证据。

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 增加静态守卫，防止后续改动绕过强验收门禁。

## 用户可见效果

- 全局主 Agent 不会因为子任务写了“已通过”就宣告整个需求完成。
- 如果子任务缺少真实验证或复核证据，用户会看到任务仍在验收中。
- 技术字段仍保留在任务卡和技术详情里，用户主文本只展示可理解的状态和下一步。

## 自测覆盖

- `runGlobalMissionStrongAcceptanceSelfTest`
  - 弱验收子任务不会通过。
  - 弱验收父任务保持执行/验收中。
  - 强验收子任务可以正常完成父任务。

- `runGlobalMissionSupervisorSelfTest`
  - 监工最终报告不会把弱验收子任务算成完成。
