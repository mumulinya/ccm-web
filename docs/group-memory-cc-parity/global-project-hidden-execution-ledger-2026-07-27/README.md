# 全局与项目主 Agent 隐藏执行链 CC 对齐

Date: 2026-07-27

Status: Implemented

## 目标

全局主 Agent和项目主 Agent实际经历的工具调用必须成为当前精确会话连续性的一部分，但不能污染用户可见聊天。压缩、恢复和上下文计量读取隐藏执行链；聊天列表仍只读取用户消息和主 Agent正式回复。

## 数据流

```text
用户消息
  -> 主 Agent 模型决策
  -> tool_use（隐藏执行链）
  -> tool_result（隐藏执行链）
  -> 主 Agent 正式回复（用户可见 transcript）

正式压缩
  -> 当前精确会话旧用户/主 Agent消息
  + 绑定这些消息的隐藏 tool_use/tool_result
  + 上一代正式摘要
  -> 新正式摘要 + 动态近期完整消息链
```

## 全局会话

- 隐藏执行事件保存在全局会话加密 transcript 的 `executionMessages`。
- `tool_started` 生成 `tool_use`，`tool_completed/tool_failed` 生成匹配的 `tool_result`。
- 每条事件绑定精确 `sessionId`、run、trace、工具调用 ID 和当前用户消息锚点。
- 全局历史 API 和聊天列表不返回隐藏执行事件。
- Provider 上下文、Session Memory、正式模型压缩和压缩后近期窗口会合并这条执行链。

## 项目会话

- 隐藏执行事件保存在精确项目会话本地文件的 `execution_history`。
- 当前记录项目主 Agent 的源码读取、运行诊断、授权 MCP、开发工作项派发和 TestAgent验收结论。
- `execution_history` 不同步到第三方 `cc-connect` 会话文件，也不由项目会话详情 API 返回。
- 删除消息会删除绑定该消息的执行事件；替换或清空会话会清空执行链并使压缩边界失效。
- 项目压缩投影、第三方记忆快照和记忆中心真实上下文计量会读取隐藏执行链。

## CC 对齐规则

- 工具使用为 assistant `tool_use`，工具结果为 user `tool_result`。
- 同一调用共享稳定 tool call ID。
- 压缩窗口和 PTL 对话轮次不能拆开工具调用与结果。
- 图片、PDF 和二进制正文替换为标记；密钥、令牌和密码字段脱敏。
- 旧大型工具结果在模型投影中 MicroCompact，原始脱敏事件仍保存在权威账本。
- System、Rules、Skills 和 MCP 定义不写进聊天摘要；实际调用和实际结果进入执行链。

## 验证

```bash
npm run check
npm run build
node scripts/session-execution-ledger-selftest.mjs
node scripts/all-session-cc-compaction-alignment-selftest.mjs
```

测试不调用付费 Provider。
