# 主 Agent 流式消息幂等与断线重试 v1

## 目标

避免并发点击、重复 SSE 数据和网络断线重发导致同一个需求被重复建任务、重复展示或长期卡在“处理中”。

## 本次升级

- 全局与群聊主 Agent 的 SSE 事件增加稳定事件 ID 和单连接递增顺序号。
- 两个前端流处理器按事件 ID 去重，重复数据不会再次更新 Todo、状态或结果消息。
- 全局请求执行失败时，仅由实际持有租约的请求结算失败状态，之后可立即安全重试。
- 全局输入断线后保留原 `request_id`；相同内容重发会复用同一个幂等键。
- 群聊输入断线后保留原 `client_message_id`；相同内容、附件和接续目标重发会复用同一个幂等键。
- 群聊重试不会重复插入同一条乐观用户消息。
- 重试签名包含会话或群聊、文本、附件和澄清/任务接续目标，避免不同请求误用同一 ID。

## 用户可见行为

- 网络中断时输入内容会恢复，并提示重新发送将继续同一次请求。
- 同一次请求即使收到重复事件，也只显示一套计划、进度和最终结果。
- 并发或重发不会创建第二个相同任务。
- 请求 ID、事件 ID 和顺序号不进入主回复，只保留在技术数据中。

## 验证

- 后端与集成 TypeScript `--noEmit` 通过。
- 前端生产构建通过。
- 主 Agent 决策 UI 自测覆盖失败结算、顺序号、事件去重和重试 ID 复用。
- 隔离生产服务真实 HTTP/SSE 验收通过：全局重复请求返回原运行，群聊与全局事件顺序递增，主文本不包含内部协议字段。

## 关键文件

- `backend/modules/global/global-agent.ts`
- `backend/modules/collaboration/collaboration.ts`
- `frontend/src/components/global/GlobalAgent.vue`
- `frontend/src/components/collaboration/GroupChat.vue`
- `scripts/main-agent-decision-ui-selftest.mjs`
- `scripts/main-agent-runtime-e2e.mjs`
