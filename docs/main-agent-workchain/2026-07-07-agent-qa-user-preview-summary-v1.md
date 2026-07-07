# Agent 问答用户预览摘要 v1

## 背景

参考 `D:\claude-code` 的 `SendMessage` 机制，子 Agent 之间通信需要有短 `summary` 作为 UI 预览。当前项目已经能记录 Agent-to-Agent 问答，但任务卡、协作看板和群聊气泡容易直接展示问题、回答、执行 ID、路由策略、证据评分等混合信息，用户理解成本偏高。

## 本次升级

- 新增 `buildAgentQaUserPreview`，为每条 Agent 问答生成用户可读摘要、问题预览、回答预览、下一步和轻量标签。
- 群聊 Agent 问答气泡默认展示摘要和短预览，执行 ID、路由策略、证据评分、证据列表收进折叠的“技术详情”。
- 协作看板 `Agent-to-Agent 问答` 使用同一套预览字段，避免直接把第三方写代码 Agent 的原始通信字段展示给用户。
- 任务卡 `Agent 问答` 小节显示“谁在等谁、结论是什么、下一步是什么”，保留紧凑展示。

## 用户体验约束

- 普通问话不会因此出现 Todo 或 Agent 问答卡。
- 用户可见文本不展示 `CCM_AGENT_RECEIPT`、`task-notification`、`trace_id`、`session_id`、`WorkerContextPacket`、raw payload 等内部协议。
- 技术字段默认折叠到“技术详情”，用于排查而不是打断用户阅读。

## 验证

- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态覆盖：后端生成用户预览、前端渲染预览、技术详情默认折叠。
- `runCollaborationUxSelfTest()` 增加运行时覆盖：任务卡问答摘要可见，并且用户可见问答文本不泄露内部协议词。
