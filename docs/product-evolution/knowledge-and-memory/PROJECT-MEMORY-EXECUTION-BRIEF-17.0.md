# 项目记忆执行前简报 17.0

## 目标

项目记忆压缩已经可用，本轮增强重点是“用起来”：项目 Agent 真正执行前，自动收到一份由 CCM 生成的项目简报，而不是只拿到用户一句原始需求。

## 新增能力

新增 `buildProjectExecutionBrief(project, taskText, options)`。

简报包含：

- 本轮用户需求。
- 项目长期记忆包：
  - 架构描述。
  - 技术栈。
  - 最近任务结论。
  - 架构 / 实现决策。
  - 历史结论压缩摘要。
  - 按本次任务 query 召回的 archive 原文证据。
  - MCP / Skill / 共享文档配置。
  - 当前文件结构。
- 当前 Git 状态摘要。
- 项目验证提示。
- 执行规则：
  - 历史记忆只能辅助判断。
  - 执行前必须读取当前真实文件和命令结果。
  - 记忆与当前文件冲突时，以当前文件为准。
  - 完成后返回结构化结论、文件、验证、风险和新决策。

## 接入入口

### 项目直连会话

`backend/server.ts` 的项目直连 `callAgentStream` 已接入。

之前：

```text
用户原始 message → Claude/Codex/Cursor
```

现在：

```text
项目执行前简报 → Claude/Codex/Cursor
```

前端任务卡仍显示用户原始需求，不暴露简报全文。

### 群聊子 Agent 派发

`backend/modules/collaboration.ts` 的 `processCrossAgents` 已接入。

群聊主 Agent 派发给某个项目 Agent 时，会同时注入：

- 群聊 / Worker 记忆包。
- 项目执行前简报。
- 任务级原生会话信息。
- 依赖输出和冲突保护信息。

## 验证

`runProjectMemorySelfTest()` 新增检查：

- 简报包含 `CCM 项目执行前简报`。
- 简报保留本轮任务。
- 简报声明“历史记忆只能辅助判断”。
- 简报包含验证提示。

`npm run test:coordinator` 会覆盖项目记忆、群聊记忆、全局记忆和项目执行链路相关 smoke。

## 后续建议

- 让简报支持“按文件路径精确召回”更细粒度 archive 证据。
- 让共享文档内容在执行前按需展开，而不仅是 ID 列表。
- 在任务 Trace 中记录简报摘要和 checksum，方便排查 Agent 是否收到正确上下文。
