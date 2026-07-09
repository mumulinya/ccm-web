# Delivery Hard Gate Next Action Priority v1

## 目标

主 Agent 是最终对用户汇报的人，不能让执行成员或第三方 Agent 自带的乐观 `next_action` 覆盖硬性验收缺口。

参考 Claude Code 的收尾规则：失败复核必须修复并重新复核，不能在 FAIL 状态下报告完成。

## 实现

- `collectDeliveryNextAction` 调整优先级：
  - 计划缺口优先。
  - 独立复核失败、失败/缺失验证、验收缺口优先。
  - 只有没有硬性缺口时，才采用下游显式 `next_action`。
- 这样即使第三方写代码 Agent 返回“可以查看改动详情”，主 Agent 也会在复核失败时展示“先返工，再重新运行 TestAgent/独立复核”。

## 用户体验

- 用户看到的是主 Agent 的最终判断，而不是下游执行成员的自述。
- 技术详情仍然默认折叠；主文本只保留“为什么还没完成”和“下一步该做什么”。

## 自测

- `explicitNextActionCannotOverridePlanGap`：计划缺口不能被乐观下一步覆盖。
- `explicitNextActionCannotOverrideFailedReview`：独立复核失败不能被乐观下一步覆盖。
