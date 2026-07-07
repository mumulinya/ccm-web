# CCM Group Memory CC Parity Phase 6

日期：2026-07-07

## 本次目标

把 partial compact 从单一 `up_to` 前缀压缩升级为更接近 Claude Code 上下文裁剪能力的选择性压缩：

- `up_to` 继续作为主压缩边界能力，推进 `lastCompactedMessageId`。
- `range` / `from` 新增为 sidecar partial segment，不推进主压缩边界。
- sidecar 段只生成可恢复摘要和元数据，原始群聊 transcript 不被修改。

## 已实现

- `backend/modules/collaboration/group-memory-compaction.ts`
  - `resolvePartialCompactWindow()` 支持：
    - `direction: "up_to"`
    - `direction: "range"`
    - `direction: "from"`
  - 新增 `buildGroupPartialCompactSidecarSegment()`：
    - 对指定中段/后段生成 deterministic summary。
    - 记录 `messageDigest`、`summaryChecksum`、质量评分、micro-compact 记录、重注入候选。
    - 保留 `rawTranscriptPath` 和 message id 范围。
  - 新增 `partialSegments`：
    - 存入 `memory.compaction.partialSegments`
    - 同步到 `memory.messageCompression.partialSegments`
    - 限制保留最近 12 个 sidecar 段。
- sidecar-only 场景：
  - 如果只请求 `range/from` 且当前不需要主压缩，返回 `partialCompacted: true`。
  - 不修改 `lastCompactedMessageId`。
  - 不增加主 `compactedMessageCount`。
  - 合并 sidecar 中抽取出的 fact anchors / persistent requirements。
- 主压缩同时发生时：
  - 仍可附带 sidecar segment。
  - segment 写入 boundary 的 `post_compact_restore.partialSidecarSegment`。

## 子 Agent 上下文

- `backend/modules/collaboration/memory.ts`
  - 受控记忆包现在携带 `compaction.partialSegments`。
  - 渲染文本新增 “选择性压缩 sidecar” 段落。
  - 展示最近 3 个 sidecar 段：
    - 方向
    - from/to message id
    - message count
    - quality score/status
    - summary checksum

## 新增自测

- `runGroupMemoryPartialCompactSidecarSelfTest()`
  - 验证 `range` sidecar 会生成 `ccm-group-partial-compact-segment-v1`。
  - 验证 sidecar 不推进主压缩边界。
  - 验证 sentinel、失败、文件线索进入 segment 摘要/重注入候选。
  - 验证 sidecar facts 合并进 group memory。
  - 验证原始 messages 不变。
- 更新 `runGroupTypedMemoryContextSelfTest()`
  - 验证子 Agent 渲染文本包含 “选择性压缩 sidecar”。

## 行为边界

- `range/from` 目前是 sidecar 摘要，不会从 active raw window 中物理删除消息。
- 这是为了避免破坏现有“旧前缀摘要 + 近期原文窗口”的稳定模型。
- 后续如果要做真正的稀疏窗口裁剪，需要新增多边界消息选择器，而不是复用单一 `keepIndex`。

## 后续增强方向

- 稀疏 active window：让子 Agent 上下文可以跳过已有 sidecar 摘要覆盖的长输出。
- PTL 自动恢复：压力下降后从 emergency digest 恢复到 normal digest。
- 蒸馏质量评分：对 `distilled-log-*.md` 执行 stale path / contradiction 检查。
