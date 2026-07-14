# Delivery Partial Verification Review Gate v1

## 目标

参考 Claude Code 的 verifier 规则：`PARTIAL` 不是完成。复核或验证只能覆盖一部分、被跳过、无法确认、证据不足时，主 Agent 必须告诉用户哪些内容还需要补齐，而不能展示为已完成。

## 实现

- 验证结果新增“未完成验证”识别：
  - `partial`、`incomplete`、`inconclusive`
  - `unable_to_verify`、`not_verified`
  - `not_run`、`not_executed`、`skipped`
  - 中文“无法验证、未执行、跳过、仅部分、证据不足、待补跑”
- 独立复核新增“部分完成/无法确认”识别：
  - `partial`、`incomplete`、`inconclusive`
  - `unable_to_verify`、`skipped`
  - 中文“部分、无法验证、无法确认、证据不足”
- 这些证据会阻止 `done` 被展示为“已完成”，并进入：
  - 用户可见状态：未完成
  - 验收证据：未完成验证
  - 复核结论：部分完成，仍有内容需要补齐
  - 下一步：补齐无法确认的内容后重新验证/复核

## 用户体验

- 用户能看懂：不是失败，也不是完成，而是“还有东西没验证到”。
- 技术细节仍默认收在技术详情里。
- 主 Agent 不会把第三方执行成员的部分验证当成最终交付完成。

## 自测

- `partialIndependentReviewDoneBlocksCompletion`：独立复核 `partial` 时阻止完成。
- `incompleteVerificationResultDoneBlocksCompletion`：验证结果 `skipped/not_run` 时阻止完成。
- 静态回归脚本检查新增 helper 和自测名，避免后续回退。
