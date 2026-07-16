# 统一大模型消费者链路审计 v1

## 审计范围

检查所有可能读取系统设置中统一大模型配置的运行入口，重点核对协议识别、Base URL 规范化、密钥读取和真实模型调用：

- 全局 Agent
- 群聊主 Agent
- 音乐 Agent
- 知识问答与需求资料解析
- TestAgent 与项目子 Agent
- 群聊会话压缩等后台模型调用

## 结论

### 直接使用统一模型的 Agent

- 全局 Agent：已统一使用共享 LLM 客户端。
- 群聊主 Agent：原本已经使用共享 LLM 客户端，无同类错误。
- 音乐 Agent：原有 Base URL 规则可以处理根地址，但动作识别和流式回答各自维护了一份协议与 URL 逻辑，存在后续漂移风险；本次已收口。

### 不直接使用统一模型的 Agent

- 项目子 Agent：使用项目配置的 Claude Code、Cursor、Codex、Gemini 等第三方运行时。
- TestAgent：使用 TestAgent CLI 和浏览器/命令验证运行时。

这两类 Agent 不会经过统一模型的 `/chat/completions` 地址拼接，因此不会出现本次全局 Agent 的同类故障。统一模型只由群聊主 Agent 用于计划、协调、验收和总结。

### 其他后台入口

- 知识问答直接复用共享 LLM 客户端。
- 需求资料解析使用共享 URL 规范化函数。
- 群聊会话压缩保留自己的响应与缓存统计逻辑，但根地址会正确规范化为 `/v1/chat/completions` 或 `/v1/messages`，不存在少 `/v1` 的问题。

## 音乐 Agent 加固

- 动作识别改为调用共享 OpenAI/Anthropic Compatible 客户端。
- 流式回答保留 SSE 和工具调用行为，但改用共享协议判断、URL 规范化与 Node HTTP 降级传输。
- 保留旧 `anthropic` 格式值兼容。
- 自测增加 OpenAI 和 Anthropic 根地址规范化断言。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `music-agent-chat-selftest.mjs`：通过，包含 11 项检查。
- 全局 Agent 真实调用：`completed`，模型调用 1 次，正常回复。
- 群聊主 Agent 真实调用：`runtime=llm-api`，未创建或派发测试任务。
- 音乐 Agent 真实 SSE 调用：动作识别来源为 `agent`，流式文本完成并收到 `done`。
- `3080` 服务已重启并加载当前构建产物。
