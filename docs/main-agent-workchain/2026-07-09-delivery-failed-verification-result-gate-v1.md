# Delivery Failed Verification Result Gate v1

## 目标

第三方写代码 Agent 或 TestAgent 可能不会填 `verification_failed`，而是把失败写在普通 `verification_results`、`verification`、`checks` 或 `completion.evidence` 里。主 Agent 必须识别这些失败证据，不能把任务展示为已完成。

## 实现

- 新增失败验证证据识别：
  - 支持 `status/result/outcome/verdict/state` 为失败。
  - 支持 `ok/pass/passed/success=false`。
  - 支持非 0 `exitCode/exit_code/code`。
  - 支持失败计数大于 0。
  - 支持文本里的“验证失败、测试失败、需要补跑、failed、exit code 1”等。
- 失败验证证据会接入：
  - 交付状态降级：`done` -> `failed`。
  - 验收证据卡：展示“失败验证”。
  - 未完成原因：展示“验证失败”。
  - 下一步：要求先补齐失败或缺失的验证证据。
- 如果整体状态因失败验证降级，乐观的 `acceptance_gate_passed=true` 不再让用户看到“最终验收：已通过”。

## 用户体验

- 用户看到的是主 Agent 汇总后的真实结论：验证失败时任务未完成。
- 执行成员或第三方 Agent 的乐观下一步不会覆盖失败验证。
- 技术细节仍默认收在技术详情中。

## 自测

- 新增 `failedVerificationResultDoneBlocksCompletion`，覆盖 `status=done`、`verification_results.status=failed`、`acceptance_gate_passed=true` 的冲突场景。
- 静态回归脚本检查失败验证 helper 和自测名，防止后续回退。
