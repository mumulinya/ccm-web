# Delivery Missing Verification Evidence Gate v1

## 目标

参考 Claude Code 的完成口径：代码改动不能只靠执行成员自述或验收乐观标记就报告完成。只要有文件变更但没有任何系统捕获的验证证据，主 Agent 必须把任务视为未完成。

## 实现

- 新增 `collectWeakMissingDeliveryVerificationEvidence`。
- 当存在文件变更，但没有：
  - 实际执行验证；
  - 外部 Runner 验证；
  - 普通验证结果；
  - 失败/未完成/缺失验证记录；
  - 明确验证来源通过；
  就生成“验证证据不足”缺口。
- 该缺口会接入：
  - `done` -> `failed` 状态降级；
  - 验收证据卡；
  - 未完成原因；
  - 下一步补齐验证证据；
  - 验收结论从乐观通过改为未通过。

## 用户体验

- 用户不会看到“代码改了但没验证也已完成”的结论。
- 主文本只说明缺少验证证据；底层执行记录仍默认在技术详情里。

## 自测

- 新增 `noVerificationEvidenceDoneBlocksCompletion`，覆盖有文件变更、验收标记通过、但没有验证证据的场景。
