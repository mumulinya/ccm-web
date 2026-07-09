# Delivery Review Pass Evidence Gate v1

## 目标

参考 Claude Code 的 verifier 规则：`PASS` 也需要可复查证据。独立复核不能只写“passed/看起来没问题”就让主 Agent 对用户报告完成。

## 实现

- 新增“已通过但证据不足”的独立复核识别：
  - 复核 verdict/status/result 为 passed。
  - 但没有 `evidence/checks/findings/filesReviewed/commands/verification/artifacts/screenshots/output` 等可核对证据。
  - 或 gate 标记 passed，但 evidence 为空或 evidence_count 为 0。
- 这种情况会阻止 `done` 展示为“已完成”。
- 用户可见复核结论会显示：“已标记通过，但复核证据仍需补齐”。
- 下一步会提示补齐独立复核的命令、截图或文件复核证据，再给最终总结。

## 用户体验

- 用户看到的是主 Agent 的验收判断，而不是下游一句“通过”。
- 技术细节仍默认折叠；主文本只告诉用户当前缺少什么证据。

## 自测

- 新增 `weakPassedIndependentReviewDoneBlocksCompletion`，覆盖 TestAgent 只返回 passed 和一句 summary、没有证据的场景。
- 静态回归脚本检查新 helper 与自测名，避免后续回退。
