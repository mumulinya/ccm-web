# Phase 52 - Tool / Skill Continuity Snapshot

## 目标

继续把 CCM 群聊记忆系统推进到 Claude Code 风格的压缩后连续性：

- Claude Code 会在压缩边界保留 discovered tools / invoked skills 一类运行期上下文。
- CCM 的群聊主 Agent、全局 Agent、项目子 Agent 每次都可能重新打开第三方 Agent 会话，因此工具与技能上下文也必须随群聊记忆稳定恢复。
- 该能力只能恢复上下文，不能扩大授权；真实派发仍以当前 runtime tool gate、MCP sync 和 authorization readiness 为准。

## 本阶段新增

新增每个群聊的工具/技能连续性 sidecar：

- `~/.cc-connect/group-tool-continuity/<groupId>/summary.md`
- `~/.cc-connect/group-tool-continuity/<groupId>/snapshot.json`

快照 schema：

- `ccm-group-tool-continuity-snapshot-v1`

快照记录：

- 群聊/项目配置的 MCP 与 Skill。
- runtime snapshot 中的 allowed tools。
- runtime sync audit 中的 requested / synced / missing。
- MCP / Skill 状态。
- permission rules、dispatch gate、authorization readiness。
- 已调用 Skill。
- source message / task / project 线索。
- `shouldReuseAsContext: true`
- `shouldBypassAuthorization: false`

## 上下文注入

已注入以下链路：

- `buildGroupMemoryContext()`：群聊主 Agent 可看到工具/技能连续性摘要。
- `buildAgentMemoryContextBundle()`：项目子 Agent 的受控记忆包包含 `compaction.toolContinuity`。
- `renderGroupMemoryContextBundle()`：子 Agent prompt 明确渲染 allowed/requested/synced/missing、invoked skills，以及“不扩大授权”边界。
- `buildGlobalGroupMemoryContext()`：全局 Agent 多群聊上下文包含 `compaction.tool_continuity`。
- `renderGlobalGroupMemoryContextBundle()`：全局 Agent 可看到每个相关群聊的工具/技能连续性状态。

## Memory Center

新增：

- `Group Tool Continuity` 后端读取器。
- `postCompactUsage.toolContinuity` 诊断。
- 前端 `Tool / Skill Continuity` 面板。
- quality check：`group_tool_continuity_snapshot`

通过条件重点：

- `snapshot.json` 存在。
- `summary.md` 存在。
- markdown checksum 匹配。
- 快照含 allowed / requested / synced / missing / invoked 之一。
- 快照必须声明 context-only，不允许绕过授权。

## 自测

新增：

- `runMemoryCenterGroupToolContinuitySnapshotSelfTest()`

自测覆盖：

- sidecar 文件创建。
- allowed tools 保留。
- synced / missing 工具保留。
- invoked skill 保留。
- 子 Agent 渲染上下文可见。
- 全局 Agent 渲染上下文可见。
- Memory Center 诊断可见。
- quality check 通过。
- 明确不绕过授权。

## 注意

本阶段没有改变真实工具授权模型。工具/技能连续性快照只提供记忆上下文，不能让子 Agent 获得未授权工具。
