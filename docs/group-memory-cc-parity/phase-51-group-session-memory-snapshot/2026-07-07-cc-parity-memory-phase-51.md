# Phase 51 - Group Session Memory Snapshot

## 背景

继续长期目标：把 CCM 群聊记忆系统升级到接近 Claude Code 的压缩、恢复和上下文使用能力。

本阶段对照 Claude Code 的 Session Memory：

- Claude Code 会维护会话级 `summary.md`，并在 auto-compact 前优先尝试用 Session Memory 作为压缩摘要。
- `buildPostCompactMessages()` 会把压缩边界、摘要、保留窗口和 hook 结果显式拼回下一轮上下文。
- 第三方子 Agent / teammate 不能假定旧 session 仍然存在，必须拿到稳定、可重注入的会话摘要。

CCM 之前已有 `cc-session-memory-v3-sync` 内存字段，但缺少一个像 CC `summary.md` 那样的稳定 sidecar 文件。本阶段补齐该缺口。

## 实现

新增 per-group session memory sidecar：

- `~/.cc-connect/group-session-memory/<groupId>/summary.md`
- `~/.cc-connect/group-session-memory/<groupId>/snapshot.json`

`saveGroupMemory()` 现在会同步生成 snapshot：

- Markdown 面向模型注入，包含 goal、session summary、persistent requirements、fact anchors、decisions、worker state、open questions、next actions 和 use policy。
- JSON 面向诊断和质量检查，包含 summary 文件路径、checksum、last summarized message id、compact counts、token counts、health 和摘要片段。

## 上下文接入

主 Agent 群聊上下文：

- `buildGroupMemoryContext()` 现在把 `sessionMemory` / `messageDigest` 算作有效记忆。
- `buildGroupContextPacket()` 输出 `CC 风格 Session Memory` 路径、checksum 和边界信息。

项目子 Agent 记忆包：

- `buildAgentMemoryContextBundle()` 注入 `compaction.sessionMemory`。
- `renderGroupMemoryContextBundle()` 渲染 summary/snapshot 路径、checksum、last summarized message id 和摘要片段。

全局 Agent 多群聊上下文：

- `buildGlobalGroupMemoryContext()` 把 session memory 放入每个群聊的 compaction 状态。
- `renderGlobalGroupMemoryContextBundle()` 展示 session memory 路径和 checksum，保证全局 Agent 转派时不丢群聊压缩记忆。

## Memory Center

新增 diagnostics 字段：

- `postCompactUsage.sessionMemory`

列表 summary 也携带轻量 `sessionMemory` 状态。

前端 Memory Center 新增 `Group Session Memory` 面板：

- summary.md 是否存在
- checksum 是否匹配
- markdown chars
- compacted message count
- markdown excerpt

## 质量检查

新增 quality check：

- `group_session_memory_snapshot`

检查内容：

- 压缩/摘要存在的群聊必须有 `snapshot.json`。
- 必须有 `summary.md`。
- Markdown checksum 必须与 snapshot 匹配。
- 必须有可注入摘要内容。

## 验证

新增自测：

- `runMemoryCenterGroupSessionMemorySnapshotSelfTest()`

覆盖：

- 高压力群聊消息生成 session memory sidecar。
- `summary.md` 保留 sentinel。
- snapshot checksum 匹配。
- 主 Agent 群聊上下文看到 Session Memory。
- 子 Agent 记忆包看到 Session Memory。
- 全局 Agent 多群聊上下文看到 Session Memory。
- Memory Center quality check 覆盖并通过。

已验证：

- `npm run check`
- `npm run build:backend`
- Phase 48/49/50/51 replay/session memory selftest matrix

## 边界

本阶段不替换现有压缩器，不引入模型后台总结调用；它把现有 CCM 群聊摘要落到稳定 sidecar，并确保主 Agent、全局 Agent、项目子 Agent 都能把它当作当前上下文使用。

后续可继续增强：

- 更接近 CC 的后台 post-sampling 更新节流。
- 在 auto-compact 阈值前显式选择 `session-memory-first` 快路径并记录成独立 compact result。
- 对 session memory Markdown 做更细的 section truncation 和重放校验。
