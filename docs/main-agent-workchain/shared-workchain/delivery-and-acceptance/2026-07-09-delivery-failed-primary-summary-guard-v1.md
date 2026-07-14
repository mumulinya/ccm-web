# Delivery Failed Primary Summary Guard v1

## 目标

当主 Agent 已经把交付状态降级为“未完成”时，用户看到的主摘要不能继续复用执行成员或第三方 Agent 写的乐观文案，例如“已调整”“已提交”“已完成”。

## 实现

- `collectDeliveryCompleted` 在 `failed/cancelled/waiting` 状态下优先生成主 Agent 自己的状态说明。
- `failed` 状态第一句固定表达为“任务没有完成，我已整理未完成原因和下一步”。
- 后续再展示未完成原因、已整理的文件变更和验证记录。
- `done` 状态仍保留原有完成内容展示。

## 用户体验

- 用户不会看到“状态：未完成”，但正文第一句又说“已调整/已提交”的冲突信息。
- 主文本保持用户可懂；具体执行记录仍默认收在技术详情里。

## 自测

- `failedDeliveryPrimarySummaryAvoidsOptimisticHeadline`：失败验证导致未完成时，主摘要不复用乐观 headline。
- `weakPassedReviewPrimarySummaryAvoidsOptimisticHeadline`：弱 PASS 复核导致未完成时，主摘要不复用乐观 headline。
