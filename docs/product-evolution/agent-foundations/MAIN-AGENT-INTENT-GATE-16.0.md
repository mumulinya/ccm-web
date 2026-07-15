# 主 Agent 意图门禁 16.0

## 目标

让群聊主 Agent 更像 Codex / Cursor：先理解用户当前这句话，再决定是否需要协调、派发或创建任务。

普通问候、闲聊、知识问答、项目说明和只读咨询，不应该展示任务卡、协作面板、并行执行、门禁原因或 `shouldDelegate` 这类内部判断。

## 用户可见规则

| 用户意图 | 可见表现 | 是否协调 |
| --- | --- | --- |
| “你好”“在吗”“谢谢” | 普通自然回复 | 否 |
| “这个项目是什么？”“架构是怎样的？” | 直接回答，可读取上下文 | 否 |
| “帮我分析一下方案” | 直接分析，必要时列建议 | 否 |
| “帮我修复 bug / 实现功能 / 修改页面 / 运行测试” | 显示任务卡，可派发项目 Agent | 是 |
| “前后端一起改 / 多项目联调” | 显示协作任务卡和执行状态 | 是 |

## 本轮实现

### 前端展示门禁

在 `frontend/src/components/GroupChat.vue` 新增 `shouldShowOrchestrationPlan(msg)`：

- 有真实 assignments 时显示协作计划。
- 有 coordination plan 时显示协作计划。
- `dispatchPolicy.action === "delegate"` 时显示协作计划。
- `direct_answer` / `ask_user` / `hold` 且没有 assignments 时不显示。

这样后端仍可保留内部 `dispatchPolicy` 供审计和记忆使用，但普通用户不会看到 “直接回复 / shouldDelegate 门禁 / 下一步等待用户” 这类内部过程。

### 测试覆盖

`scripts/unified-chat-task-experience-e2e.mjs` 增加断言：

- 群聊普通 direct answer 必须通过 `shouldShowOrchestrationPlan` 控制展示。
- 模板不能再直接用 `dispatchPolicy` 作为显示条件。

## 后续建议

- 后端也可以进一步在普通 direct answer 响应中减少 `analysis` / `dispatchPolicy` 下发，只保留服务端审计。
- 浏览器 E2E 可补充真实输入 “你好”，截图断言页面不出现“并行执行”和“门禁”。
