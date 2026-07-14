# 统一任务卡用户待办摘要守门 v1

## 背景

统一任务卡会展示 `user_request_summary`、`clarification_summary`、`confirmation_summary`。澄清和授权类信息确实需要用户看到，但第三方写代码 Agent 或内部链路也可能把“等待执行成员提交结果说明”“等待验收/总结”这类系统推进状态塞进同名字段，导致界面出现“需要你处理”的误导。

## 改动

- 在 `TaskExperienceCard.vue` 增加 `taskUserRequestNeedsAction` 守门逻辑。
- 明确的澄清、授权、人工确认、等待用户补充/回复继续展示在用户待办区。
- 内部推进、等待执行成员、等待复核/验收/总结等内容不再显示成“需要你处理”，仍可作为普通下一步或技术详情保留。
- 支持 `display_policy.user_visible === false`、`requires_user_action` / `user_action_required` 显式控制。

## 回归

- 新增视觉 fixture：`case-user-request-summary-guard`。
- 覆盖两个场景：
  - 内部推进摘要不渲染 `.user-request-summary`。
  - 真实等待用户确认摘要仍渲染问题和建议。
- `main-agent-decision-ui-selftest` 增加源码守门检查。

## 预期效果

用户只在确实需要确认、授权或补充信息时看到“需要你处理”。主 Agent/群聊主 Agent 的内部协作、验收、返工、总结步骤继续以“下一步”或技术详情呈现，减少误解。
