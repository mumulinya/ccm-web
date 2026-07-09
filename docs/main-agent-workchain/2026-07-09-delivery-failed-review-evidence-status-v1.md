# Delivery Failed Review Evidence Status v1

## 目标

当第三方写代码 Agent、TestAgent 或独立复核器只在复核证据里写出 `failed`、`未通过`、`需要返工`，但没有显式提供 `independent_review_required` 或 `independent_review_gate` 字段时，主 Agent 也不能把任务展示为已完成。

## 实现

- 交付报告新增复核证据失败识别：从 `independent_review`、`independent_review_evidence`、`code_review`、`delivery_summary`、复核 gate evidence 等来源收集原始证据。
- 只要复核证据显示失败或需要返工，即使输入状态是 `done`，用户可见状态也降级为“未完成”。
- 风险区会显示“独立复核未通过”，下一步会要求原执行成员返工，修复后重新运行 TestAgent/独立复核。
- 修正中文“未通过”被误识别成“已通过”的边界，并避免“未发现阻塞风险”被误判为失败。

## 用户体验

- 用户不会看到内部 gate 字段或协议名。
- 用户能直接看到：当前不是已完成，而是需要返工复核。
- 技术细节仍默认放在技术详情里，主文本只保留可理解的状态、原因和下一步。

## 自测

- 新增 `failedIndependentReviewEvidenceOnlyDonePrioritizesRework` 自测，覆盖只有复核 evidence 失败、没有 gate/required 字段的场景。
- 静态回归脚本补充 helper 和自测名检查，防止后续回退。
