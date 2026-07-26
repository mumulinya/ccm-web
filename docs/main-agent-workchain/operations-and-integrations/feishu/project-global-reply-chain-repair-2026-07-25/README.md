# 项目与全局飞书回复链修复

## 问题

项目飞书配置虽然已在 CCM 页面绑定到项目会话，但 cc-connect 运行配置仍使用开发 Agent 类型。因此飞书消息直接进入项目开发 Agent，绕过项目主 Agent、项目会话记忆、任务编排和 TestAgent。用户看到的 Provider 错误只是这条错误直连链路的原样输出，不代表开发 Agent 配置本身存在问题。

全局机器人已经使用 ACP，但仅依赖 Fetch 的中止信号。底层请求未按预期结束时，cc-connect 回合可能一直停在“processing message”，用户收不到成功或失败回复。

## 当前链路

```text
项目飞书消息
-> cc-connect 项目长连接
-> 项目 ACP
-> ACP agent_session_id 映射 cc-connect 精确会话
-> 项目主 Agent
-> 普通回复，或开发 Agent + TestAgent 闭环
-> cc-connect 将用户消息与正式回复写入同一项目会话
-> 原飞书消息
```

项目持久配置仍保存真实开发 Agent 类型。只有 cc-connect 的私有运行时配置被替换为 ACP，因此网页项目任务和项目主 Agent仍能读取原配置并选择 Claude Code、Codex、Cursor、Gemini CLI 或 OpenCode。

## 会话与失败策略

- cc-connect 的 ACP 请求只包含 ACP 会话 ID和正文，不包含 `chat_id/open_id`；CCM从 cc-connect 会话快照解析 `agent_session_id -> s* -> platform_session_key`。
- 群聊话题仍由 cc-connect 使用 `chat_id + root/thread` 隔离，私聊使用 `chat_id + open_id`；解析结果必须落到当前项目的活动绑定。
- 首次 ACP 会话尚未落盘时，只有项目恰好存在一个活动飞书绑定才允许无歧义兜底；多个目标一律 fail closed。
- transcript 由 cc-connect 统一写入，ACP适配器不再重复追加用户消息和回复；开发过程仍只进入任务时间线和任务回放。
- 未绑定、多重匹配、模型失败或超时都会返回原飞书回合，不能静默丢失。
- 全局和项目 ACP都使用 Promise 硬超时并同时中止 HTTP 请求，确保异常请求也能结束 ACP 回合。

## 实机复查收口

首次修复后的真实飞书消息仍暴露了四处仅靠模拟测试没有覆盖的问题：

1. `fetch()` 已取得响应头后，`response.json()` 或 `response.text()` 仍可能永久等待。现在硬超时覆盖完整请求与响应体读取。
2. 项目从开发 Agent直连切换到 ACP后，cc-connect 创建了新的 `smart-live-Cloud.json`，旧逻辑却固定优先旧哈希文件。现在始终选择最近写入的真实活跃会话存储。
3. 全局 ACP请求不携带飞书身份。CCM现在根据 `acpSessionId` 从当前 cc-connect 会话反查唯一 `platform_session_key`，恢复 `chat_id/open_id/thread` 后再执行授权和会话路由。
4. 全局项目目录新增 `display_name` 后，边界校验 schema没有同步更新。`display_name` 现已作为安全路由目录字段显式准入，仍不允许项目消息或项目记忆进入全局上下文。
5. 项目后端已生成正式回复，但 `cc-connect 1.3.2` 的项目通道仍把回合落成 `(空响应)`。项目私有 ACP运行副本现在统一使用已由全局通道验证的 `compact` 进度模式；持久项目配置不被改写。ACP适配器在 stdout 确认写入文本通知后才返回 `end_turn`，并仅在项目日志记录模式、会话 ID和字符数，不记录回复正文。

适配器每轮使用唯一消息 ID，不再让重启后的 JSON-RPC序号命中旧幂等记录。项目和全局都拒绝空正文；错误、超时和空响应必须形成可见失败回复。

## 验证

- `node scripts/feishu-project-main-agent-acp-selftest.mjs`：使用真实 ACP 参数形态验证项目 ACP身份、精确绑定、项目主 Agent SSE、cc-connect 单一 transcript所有权、私有运行配置切换，以及文本通知严格先于回合结束响应。
- `node scripts/feishu-control-bot-reliability-selftest.mjs`：全局 ACP端口、卡住回合、超时提示和结束回合通过。
- `npm run check`、`npm run build:backend` 通过。
- Mock 验证付费 Provider调用为 0。

真实本机链路验证（不向飞书主动发送测试消息）：

- 项目 `/api/send-stream` 返回项目主 Agent SSE正文“项目飞书链路正常。”。
- 全局 `/api/feishu/control-bot/message` 返回 `reply=全局飞书链路正常`。
- 真实项目 ACP `session/update` 输出“项目 ACP 输出正常。”并以 `end_turn` 结束。
- 真实全局 ACP `session/update` 输出“全局 ACP 输出正常”并以 `end_turn` 结束。
- 验证产生的测试会话消息已从当前历史和备份中精确清理。

2026-07-25 01:55 的首次重连仍由 01:37 启动的旧 CCM主进程 `39872` 执行。虽然磁盘上的后端已重新构建，但运行中的 Node.js进程没有热加载新的私有配置生成逻辑，因此该次重连不能证明 `compact` 已生效，这是此前判断错误的直接原因。

2026-07-25 02:04 已执行正式 `ccm restart --background`，新 CCM主进程为 `11884`，项目通道为 `23452`。在临时配置清理前读取实际运行文件并确认：Agent 类型为 `acp`、进度模式为 `compact`、参数包含 `--project=smart-live-Cloud`；持久项目配置仍为 `card`，没有被私有运行转换污染。项目通道日志改为追加模式并包含每次启动分隔线，重连不再覆盖失败回合证据。

等待下一条真实飞书入站消息后，以项目日志中的 `reply delivered mode=project`、`turn complete response_len` 和会话历史不再写入 `(空响应)` 作为最终平台验收。没有真实入站消息时不得宣称飞书端已通过。
