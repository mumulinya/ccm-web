# Delivery False Done Show Policy v1

## 目标

如果交付输入表层状态是 `done`，但验收、验证、计划核对或独立复核证据里已经出现阻塞缺口，主 Agent 必须把交付报告展示给用户，不能因为 `executed` 字段缺失就隐藏。

## 实现

- `shouldShowMainAgentDeliveryReport` 在普通问答之外，会复用 `hasBlockingDeliveryCompletionGap` 判断。
- 只要存在阻塞缺口，即使状态写着 `done`，也会展示交付报告。
- 普通问答仍然优先隐藏交付报告，不会因为这条策略误显示 Todo 或交付卡。

## 自测

- 新增 `failedReviewEvidenceShowsByPolicy`，覆盖 `executed=false`、`status=done`、但独立复核 evidence 显示 failed 的场景。
- 静态回归脚本检查该策略和自测名，防止后续被删掉。
