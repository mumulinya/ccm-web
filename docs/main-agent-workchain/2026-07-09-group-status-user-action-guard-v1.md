# 群聊状态用户待办守门 v1

## 背景

群聊主 Agent 在回答“现在进展怎么样”时，会汇总当前 Todo、执行成员状态、复核状态和用户待办。此前 `phase === needs_user` 容易把 `needs/blockers` 全量归到“需要你处理”，其中有些其实是主 Agent 或执行成员要继续补齐的验证证据、结果说明或复核缺口。

## 改动

- 新增 `groupStatusPhaseNeedsUserAction`，只在状态文本明确包含用户确认、补充、授权、回复等语义时，才把 `needs_user` 阶段解释为用户待办。
- 收紧 `groupTodoTextNeedsUserAction`，避免泛化匹配“补齐验证证据”这类内部工作。
- `buildGroupStatusUserActionSummary` 不再因为 `phase === needs_user` 就直接把所有 blockers/needs 放入“需要你处理”。
- `current_todo_summary.needs_action` 也会先经过用户动作语义判断，防止外部状态把内部下一步误塞进用户待办。

## 回归

- 新增后端自测 `groupStatusFollowupAvoidsInternalNeedsUserAction`：
  - 内部验收补齐状态不显示“需要你处理”。
  - 真实执行前计划确认仍显示“需要你处理”。
- `main-agent-decision-ui-selftest` 已加入新 helper 和自测项检查。

## 预期效果

用户询问群聊任务进展时，界面会更像真实协调者：该主 Agent 继续处理的事情写成“下一步/当前 Todo”，只有真正需要用户确认、授权或补充资料时才显示“需要你处理”。
