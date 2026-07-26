# 会话上下文 MCP 与 Skill 分项计量

## 问题

全局飞书会话为了避免 ACP 与 CCM 重复写入同一条聊天消息，跳过了全局 Agent运行结束后的消息写入。旧实现把上下文计量写入放在同一个条件分支内，导致飞书会话只剩 transcript Token估算，页面只能显示 `Provider observed remainder`，无法展示 MCP、Skill、System和工具分项。

## 修复

- 飞书会话继续由通道层写入用户消息和正式回复，不重复写 transcript。
- 全局 Agent每次调用 Provider前保存最后一轮 `ModelVisiblePayloadSnapshot`。
- 网页与飞书在运行结束后都写入同一份脱敏 accounting snapshot。
- accounting只保存 Token分项、总量和 checksum，不保存第二份 system prompt、MCP正文、Skill正文或聊天原文。
- `recordGlobalAgentSessionProviderUsage` 和项目对应入口优先使用调用方提供的真实 Provider快照，避免事后用不完整上下文重建。
- 固定上下文中的嵌套 Rules、Skills、MCP和子 Agent定义可以递归归类。
- 页面已有的 `Skills`、`MCP & dynamic tools`、`MCP hydrated context` 分项继续按非零真实数据展示。

没有进入本轮模型上下文的已配置 MCP或 Skill不会计入，也不会为了展示而虚构 Token。旧会话没有历史快照时不反推伪分项，页面明确显示“历史 Provider 总量（无分项快照）”；该会话下一次模型请求完成后开始显示真实分项。

## 验证

- 精确群聊会话没有历史分项快照时，详情接口使用当前主 Agent prompt 构造器即时重建只含 Token 账目的快照；概览列表不执行该重建。
- 重建快照包含当前 system、规则、可见 Skill、只读 MCP 工具、项目 Agent 定义和当前精确会话上下文，不返回这些内容的正文。

- `session-context-component-breakdown-selftest.mjs`：所有模型可见上下文类别守恒且独立计量。
- `session-context-accounting-persistence-selftest.mjs`：全局 Web、全局飞书和项目会话保存脱敏分项，飞书接受精确 Provider快照。
- `memory-center-live-token-display-selftest.mjs`：全局、群聊、项目和任务 Agent精确会话互相隔离并返回真实 Token状态。

测试全部使用本地数据，付费 Provider调用为 0。
