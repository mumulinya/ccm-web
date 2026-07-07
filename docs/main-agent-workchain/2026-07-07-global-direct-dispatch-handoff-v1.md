# 全局 Agent 直接派发工作单 V1

本轮目标：补齐全局主 Agent 直接向群聊主 Agent 或项目 Agent 下发指令时的完整链路，避免绕开前面已经建立的计划、执行、验收和总结机制。

## 参考来源

- `D:\claude-code\src\coordinator\coordinatorMode.ts`：Worker 不能默认看到完整对话，派发提示必须自包含。
- `D:\claude-code\src\tools\TodoWriteTool\TodoWriteTool.ts`：真正执行任务时要让用户看到计划和进度，完成后继续核验。
- 本项目既有群聊任务卡、全局任务监工、自包含 Worker handoff 和统一交付报告。

## 本次实现

- 全局 `send_group_cmd` 不再只把原始消息塞给群聊，而是生成“全局主 Agent 指令工作单”。
- 群聊派发会显式使用 `message_mode: "project_task"` 和 `force_task: true`，让群聊主 Agent 进入任务链路，展示计划、执行、验收和最终总结。
- 群聊可见工作单只保留用户能理解的目标、链路和验收要求，不暴露内部协议字段。
- 全局 `send_project_cmd` 会给项目 Agent 注入完整自包含工作包，包含目标、范围、禁止事项、验证要求、ACK gate 和结构化回执要求。
- `/api/groups/send` 的 SSE 返回新增专用解析，直接派发后可以正确拿到任务 ID、队列状态和主 Agent 回执。
- 群聊直接派发的返回会明确说明“已派发并进入任务链路”不等于“需求已经完成”，最终结果以任务卡验收和最终总结为准。
- 项目 Agent 的原始输出在全局总结里会先做友好化处理，内部协议和排障字段仍进入技术详情或项目面板。

## 用户体验

- 用户给全局主 Agent 派发真实任务后，群聊里会看到主 Agent 接管任务，而不是一段技术提示词。
- 普通问题仍按普通对话处理，不展示 Todo 或任务卡。
- 完成后总结重点展示：做了什么、改了哪里、怎么验证、还有什么风险。

## 验证

- `runGlobalAgentIntentSelfTest()` 增加直接派发检查：
  - 群聊可见工作单友好可读。
  - 群聊可见工作单不泄漏内部协议字段。
  - 群聊异步派发不会把“已接管”写成“已完成”。
  - 项目内部工作单保持自包含。
  - 只运行测试类指令不会被强行判定为必须改代码。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态断言，防止后续改动删掉直接派发 handoff 链路。
