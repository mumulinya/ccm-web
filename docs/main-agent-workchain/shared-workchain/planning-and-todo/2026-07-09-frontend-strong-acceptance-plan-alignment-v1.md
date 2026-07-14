# Frontend Strong Acceptance Plan Alignment v1

## 目标

后端已经收紧了“弱验收标记不能算完成”的口径，但前端任务卡仍可能遇到历史数据或兼容数据：只有 `acceptance_gate_passed=true`，没有真实验证、独立复核或具体验收明细。这个场景不能把计划核对显示成“已对齐”。

## 实现

- 新增 `hasStrongDeliveryAcceptance`。
- 前端计划核对只把以下内容当作强验收依据：
  - 实际验证记录；
  - 验证证据卡里的真实执行证据；
  - 独立复核通过记录；
  - 带明细的正向验收项。
- 裸文本“最终验收已通过”或 `acceptance_gate_passed=true` 不再直接推动计划核对通过。
- 全局任务卡和全局监工任务卡的 `delivery.acceptance_passed` 也改为同一口径。

## 用户体验

- 历史任务或兼容数据不会因为一个乐观验收字段显示“计划已对齐”。
- 用户会看到具体缺口，下一步仍是补齐证据后再最终总结。
- 技术字段仍留在技术详情，不进入主文本。

## 自测

- 新增 `globalWeakAcceptanceOnlyDoesNotAlignPlan`：
  - 全局任务状态为 completed；
  - 只有 `acceptance_gate_passed=true`；
  - 没有验证、复核或验收明细；
  - 预期计划核对为 `deviated`，且 `delivery.acceptance_passed=false`。
