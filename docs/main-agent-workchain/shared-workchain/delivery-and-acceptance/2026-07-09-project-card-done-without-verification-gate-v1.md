# Project Card Done Without Verification Gate v1

## 目标

项目执行成员的 `done` 事件只能说明它提交了结果，不能直接代表主 Agent 已经完成验收。参考 Claude Code 的报告口径：没有验证就必须说没有验证，不能把执行结束包装成已通过。

## 实现

- 项目执行卡复用 `hasStrongDeliveryAcceptance`。
- 只有存在实际验证、复核或带明细的验收证据时，`delivery.acceptance_passed` 才为 true。
- 如果项目执行成员已结束但没有验证证据：
  - 交付摘要显示“仍需补齐验证或验收”；
  - 用户交接卡进入 `needs_attention`；
  - 下一步提示先补齐验证或验收证据。

## 用户体验

- 用户不会把“执行成员说 done”误读成“最终验收通过”。
- 主文本仍保持自然语言，底层事件和原始记录继续放在技术详情里。

## 自测

- 新增 `projectDoneWithoutVerificationDoesNotPassAcceptance`：
  - 项目执行成员提交 `done`；
  - 存在文件改动；
  - 没有验证记录；
  - 预期卡片仍显示需补齐验证或验收。
