# 全局 Agent 统一模型客户端修复 v1

## 问题

系统设置中的统一大模型连接测试可以通过，但全局 Agent 普通问话会返回“当前统一大模型不可用”。真实运行记录中的错误为：

```text
Unexpected token '<', "<!doctype "... is not valid JSON
```

设置页连接测试使用统一 LLM 客户端，会把服务商 Base URL 规范化为 `/v1/chat/completions`；全局 Agent 仍保留旧的独立请求实现，只追加 `/chat/completions`。当配置为服务商根地址时，旧实现请求到 HTML 页面，随后在 JSON 解析阶段失败。

## 修复

- 全局 Agent 的 OpenAI Compatible 和 Anthropic Compatible 请求统一复用 `group-orchestrator-llm-client.ts`。
- 保留全局 Agent 原有的上下文体积限制、超时、温度和重试策略。
- 删除全局 Agent 内重复的 URL、请求头、请求体和响应解析逻辑。
- 在模型重试自测中增加两种协议的 Base URL 规范化断言。

统一后，系统设置连接测试、全局 Agent、群聊主 Agent 和音乐 Agent 对 API 地址采用同一套解释规则。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `runGlobalModelRetrySelfTest()`：通过，包含瞬时错误重试、永久错误不重试和两种 Base URL 规范化检查。
- 真实统一模型连接测试：通过，模型为设置页当前配置的模型。
- 重启 `3080` 后真实调用 `/api/global-agent/run`：状态 `completed`，模型调用 1 次，返回“今天是星期四。”，未触发模型不可用兜底。

## 运行说明

`3080` 由全局 npm 包命令启动，但该包通过 Junction 指向项目内 `ccm-package`。后端构建后仍需重启正在运行的 Node 进程，新的模型客户端实现才会进入内存。
