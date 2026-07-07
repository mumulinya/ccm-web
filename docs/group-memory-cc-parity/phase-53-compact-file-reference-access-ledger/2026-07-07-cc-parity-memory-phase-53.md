# Phase 53 - Compact File Reference Access Ledger

## 目标

继续对齐 Claude Code 压缩后的上下文恢复方式：

- Claude Code 会用 `compact_file_reference` attachment 表示“压缩前读过/引用过该文件，但内容过大，不直接塞回上下文”。
- Claude Code 还通过 session file access hooks 追踪 session memory、transcript、memdir 是否被工具访问。
- CCM 的第三方项目子 Agent 每次都可能是新会话，因此不仅要注入摘要，还要把压缩后的权威文件路径显式作为可引用上下文下发，并让 Memory Center 看到这些引用是否被声明使用。

## 本阶段新增

新增 per-group compact file reference ledger：

- `~/.cc-connect/group-memory-file-references/<groupId>.json`

新增 schema：

- `ccm-group-compact-file-references-v1`
- `ccm-group-compact-file-reference-ledger-v1`
- `ccm-group-compact-file-reference-access-summary-v1`

## 引用来源

`buildGroupCompactFileReferences()` 会生成 CC 风格 compact file references，覆盖：

- `group_session_memory`：群聊 Session Memory `summary.md`
- `group_session_memory_snapshot`：Session Memory `snapshot.json`
- `tool_continuity_summary`：工具/技能连续性 `summary.md`
- `tool_continuity_snapshot`：工具/技能连续性 `snapshot.json`
- `typed_memory_index`：typed `MEMORY.md`
- `typed_memory_dir`：typed memory 目录
- `group_memory_json`：结构化群聊记忆 JSON
- `raw_group_messages_json`：最高保真原始群聊消息 JSON
- recall/distillation/reinjection/dispatch/replay repair 相关 ledger

## 上下文注入

子 Agent 记忆包新增：

- `compact_file_references`
- `compact_file_reference_access`

`renderGroupMemoryContextBundle()` 会渲染：

- reference id
- 类型
- 文件路径
- exists 状态
- 使用规则

关键规则：

- 文件引用只是压缩后恢复来源，不代表当前文件内容已被重新读取。
- 需要更多原文时，优先读取 `raw_group_messages_json` 或 typed `MEMORY.md`。
- 读取或忽略后，子 Agent 回执应在 `memoryUsed/memoryIgnored` 中声明 reference id 或路径。

全局 Agent 多群聊上下文也新增 compact file references 摘要，方便全局派发前知道每个群聊的可回溯来源。

## Access Ledger

`recordGroupCompactFileReferenceSurfacing()` 会在子 Agent bundle 生成时记录：

- scope
- target project
- reference fingerprint
- reference list
- missing count

`summarizeGroupCompactFileReferenceAccess()` 会从以下位置推断使用情况：

- worker ledger 的 `memoryUsed/memoryIgnored`
- worker ledger summary
- 群聊消息 content
- receipt / delivery summary

这不是授权系统，只是类似 Claude Code session file access analytics 的可观测性层。

## Memory Center

新增：

- group detail：`postCompactUsage.compactFileReferences`
- group detail：`postCompactUsage.compactFileReferenceAccess`
- quality check：`compact_file_references`
- 前端面板：`Compact File References`

质量检查关注：

- 压缩后群聊是否能构建 compact file references。
- 是否包含 `group_memory_json` 和 `raw_group_messages_json` 这两个权威来源。
- 是否至少包含 session memory、typed MEMORY 或 tool continuity 之一作为压缩恢复来源。
- 是否存在 missing path。

## 自测

新增：

- `runMemoryCenterCompactFileReferenceSelfTest()`

覆盖：

- 子 Agent bundle 构建 compact file references。
- 渲染文本包含 `reference_id` 和 `raw_group_messages_json`。
- surfacing ledger 落盘。
- access summary 能识别 reference id 被声明使用。
- Memory Center detail 可见。
- 全局 Agent 多群聊上下文可见。
- quality check 通过。

## 边界

本阶段不读取或注入所有文件全文。它只把压缩恢复路径显式化，并建立使用观测。真实读取仍由当前任务需求、工具授权和子 Agent 实际执行决定。
