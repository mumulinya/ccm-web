# Phase 326: Pre-compact Loaded Tool State Carry

## 目标

补齐 Claude Code compact boundary 的 `preCompactDiscoveredTools` 语义。

Phase 325 已能在压缩后恢复当前 deferred tools、Agent listing 和 MCP instructions 的目录变化，但还没有保存“本会话压缩前已经加载过哪些动态工具”。如果工具最初通过 Tool Search 被加载，而承载 `tool_reference` 的旧消息随后被摘要替换，压缩后运行时可能只能看见工具目录，却失去已经加载 schema 的连续性。

本阶段要求：

- 从当前精确 `group_id + gcs_*` 会话的 `tool_reference`、动态工具调用和旧 compact boundary 恢复已加载工具集合。
- 只携带当前仍授权且仍存在于实时动态工具目录的工具。
- 授权撤回或目录删除的动态工具必须明确丢弃。
- 普通内置 `Read`、`Bash` 等调用不得被误判为撤回的动态工具。
- full compact、partial compact、进程重启和每个新 `tas_*` 子 Agent 会话必须保持同一语义。
- 不修改原始群聊消息和 `tasks.json`。

## Claude Code 对照

参考：

- `D:\claude-code\src\services\compact\compact.ts`
  - compact 前调用 `extractDiscoveredToolNames(messages)`。
  - 把结果写入 `boundaryMarker.compactMetadata.preCompactDiscoveredTools`。
- `D:\claude-code\src\utils\toolSearch.ts`
  - 从 `tool_result` 内的 `tool_reference` 提取动态工具名。
  - 压缩后从 compact boundary 重新读取这些名字，继续向 API 提供已经加载的工具 schema。

CCM 的差异在于项目子 Agent 每次任务可能创建新的 Claude Code、Cursor 或 Codex 会话，因此除 compact boundary 外，还必须把携带状态重新投递到新 Worker 的记忆上下文。

## 实现

### Loaded Tool State

`backend/modules/collaboration/group-memory-compaction.ts` 新增：

- `GROUP_POST_COMPACT_LOADED_TOOL_STATE_VERSION`
- `extractGroupPreCompactLoadedToolNames()`
- `buildPreCompactLoadedToolState()`

提取来源：

- `tool_result.content[].type === tool_reference`
- `tool_use` / `server_tool_use`
- 第三方 Agent 风格 `tool_calls`
- 旧 `compactMetadata.preCompactDiscoveredTools`
- 旧 dynamic context attachment 的 carried names

候选随后与当前授权后的 `catalog.tools` 求交集：

- `carried_names`：仍授权且目录存在，继续携带。
- `dropped_names`：此前加载过但当前授权或目录已撤回，不再携带。
- 非 `mcp__*` 且不在当前动态目录中的普通内置工具会被忽略。

### Compact Boundary

完整压缩现在写入：

```text
compactBoundary.compactMetadata.preCompactDiscoveredTools
compactBoundary.post_compact_restore.preCompactDiscoveredTools
compaction.preCompactDiscoveredTools
```

partial sidecar 同样从完整当前会话和旧 boundary 恢复工具集合，不会只扫描被选择的局部区间。

### Dynamic Context Attachment

Phase 325 attachment 增加 `loadedToolState`：

- 正文明确列出压缩前已加载且仍授权的工具。
- 被撤回工具在大正文前明确写出 `Do not call it`。
- 正文继续使用 20,000-token 首尾保留上限。
- body-free receipt 只保存名称、hash、计数和 checksum，不保存工具描述或 MCP instructions 正文。

`verifyGroupPostCompactDynamicContextDeltaReceipt()` 新增：

- schema/version 校验
- carried/dropped 数量一致性
- 重复和集合冲突校验
- state checksum 校验
- attachment manifest 对 loaded tool state 的绑定

旧 Phase 325 attachment 没有 `loadedToolState` 时继续按旧 manifest 验证，不会因本阶段升级被错误判坏。

### 新子 Agent 会话

`backend/modules/collaboration/memory.ts` 在为每个新 `tas_*` / native session 生成 live full catalog 时，会从当前群聊 compact boundary 重新带入 `carried_names`，再与当前实时授权目录求交集。

因此：

- 新 Worker 不复用其他子会话的“已公告”状态。
- 新 Worker 能收到当前会话压缩前已加载工具的连续性提示。
- 工具权限缩小时不会借 compact boundary 恢复已经撤销的 schema。
- 全局 Agent 未接入群聊 loaded tool state。

### Memory Center

`Post-compact Dynamic Context Delta` 面板新增 `loaded tools` 指标：

- carried count
- dropped after auth/catalog check

面板继续只显示 body-free receipt。

## 验收

新增专项脚本：

```powershell
npm run test:group-pre-compact-loaded-tool-state-restart
```

结果：`36/36`。

覆盖：

- Tool Search `tool_reference`
- `tool_use` 和第三方 `tool_calls`
- 旧 compact boundary 继承
- 内置工具排除
- 当前授权目录求交集
- 授权缩小时 fail-closed 丢弃
- full / partial compact
- compact boundary 三处持久化
- body-free receipt 和篡改拒绝
- 精确群聊会话隔离
- 新子 Agent 和最终 Worker 重注入
- Memory Center 指标
- 进程重启恢复
- 原始 transcript 不变

回归通过：

- Phase 325 dynamic context delta：`34/34`
- Phase 324 current plan：`33/33`
- Phase 323 invoked Skill：`32/32`
- compact restart soak：`11/11`
- compaction hook 双会话隔离：`27/27`

## 结论

CCM 现在不仅会在压缩后重新公告“有哪些工具”，还会像 Claude Code 一样携带“哪些动态工具在压缩前已经加载”。该状态受当前实时授权再次约束，并会为每个新的第三方项目子 Agent 会话重新生成，解决了目录可见但工具 schema 连续性未被证明的问题。
