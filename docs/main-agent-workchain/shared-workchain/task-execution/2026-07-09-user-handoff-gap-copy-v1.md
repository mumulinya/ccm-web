# 任务交接缺口文案 v1

## 背景

统一任务卡的“接下来建议”会在任务失败、暂停或验收证据不足时给用户一个继续入口。此前内部缺口会显示成“需要处理”“需处理”，容易让用户误会这些都需要自己动手处理。

## 改动

- 非用户确认类缺口统一改为“待补齐”。
- “继续处理缺口”改为“继续补齐缺口”，语义更像主 Agent 继续收敛证据。
- 只有真正等待用户确认/补充的场景才显示“待你确认/补充”。
- `needs_attention` 状态标签从“需处理”改为“待补齐”。

## 回归

- `unified-chat-task-experience-selftest` 新增 `projectDoneWithoutVerificationHandoffUsesNeutralGapCopy`。
- `main-agent-decision-ui-selftest` 检查该自测项和 `项待补齐` 文案。

## 预期效果

用户看到交接卡时能更清楚地区分：哪些是主 Agent 继续补齐的交付/验证缺口，哪些才需要用户确认或补充资料。
