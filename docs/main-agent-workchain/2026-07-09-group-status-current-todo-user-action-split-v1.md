# 群聊状态追问当前 Todo 与用户动作分流 v1

## 背景

参考 `D:\claude-code\docs\tools\task-management.mdx` 和 `D:\claude-code\src\skills\bundled\batch.ts`：CC 的任务状态会把“正在做/等待谁返回”和“需要用户审批或补充”的状态分开呈现。

本项目群聊主 agent 已经能展示当前 Todo，但状态追问里会把 `needs_action` 直接归入“需要你处理”。当 `needs_action` 实际是“等待执行成员提交结果，然后我验收”时，用户会误以为任务卡正在等自己操作。

## 本次改动

- 群聊当前 Todo 的 `needs_action` 只保留真正需要用户确认、补充、授权、回复、上传或选择的内容。
- 普通推进动作改放到 `next_action`。
- 群聊状态追问新增“当前 Todo”摘要，展示主 agent 正在推进的步骤、刚完成的步骤和下一步。
- “需要你处理”只在确实需要用户动作、存在待确认问答、阻塞项或补充信息时出现。

## 用户可见效果

- “等待执行成员提交结果说明，然后我验收”会展示为当前 Todo/下一步。
- 不会再展示成“需要你处理：等待执行成员提交结果说明，然后我验收”。
- 技术内容仍默认在任务卡技术详情里。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- 构建后 `runGroupStatusFollowupSelfTest()`
- `npm run test:render-regression`
- `git diff --check`
