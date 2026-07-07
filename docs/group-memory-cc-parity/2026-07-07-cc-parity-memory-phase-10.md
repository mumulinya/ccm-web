# CCM Group Memory CC-Parity Phase 10

日期：2026-07-07

## 目标

对照 `D:\claude-code` 的 Session Memory Compact / CompactBoundary 机制，补齐 CCM 群聊记忆的 CC 风格保留窗口和 preserved segment 边界账本。

## 对照发现

Claude Code 的压缩不是单纯保留最近 N 条消息，而是按以下约束计算保留窗口：

- 至少保留一定 token 深度。
- 至少保留一定数量的文本消息。
- 最多保留到 token 上限附近，避免压缩后马上再次超限。
- 边界不能切断工具调用/结果、thinking/tool_use 等 API 不变量。
- CompactBoundary 会记录 preserved segment，供恢复和后续压缩判断使用。

CCM 之前已有 `calculateGroupMessagesToKeepIndex()`，但同步记忆快照路径仍主要使用固定 `recentLimit`；边界也只有 `preservedMessageIds`，没有独立 preserved segment 账本。

## 本次升级

- 增强 `calculateGroupMessagesToKeepIndex()`：
  - 支持配置化 `minKeepMessages` / `minKeepTokens` / `maxKeepTokens`。
  - 使用 task id / receipt task id / delivery summary task id 识别同一任务事务。
  - 当保留边界落在任务回执中间时，会向前扩展，避免切断 user -> worker receipt 上下文。
- 新增 `buildGroupPreservedSegment()`：
  - 记录 `keepIndex`、保留消息数、文本消息数、token 估算、首尾 message id、summary checksum、raw transcript path。
  - 记录是否保护了同一任务事务。
- `compactGroupConversationMemory()` 的 compact boundary、post compact restore、compaction、messageCompression 均写入 `preservedSegment`。
- `refreshGroupConversationMemorySnapshot()` 从固定 recent window 升级为 CC 风格 token/text-message 动态保留窗口，并同样写入 `preservedSegment`。
- 子 Agent / 全局 Agent 记忆上下文渲染会显示 preserved segment，方便后续恢复和审计。
- 新增 `runGroupMemoryPreservedSegmentSelfTest()`，验证任务事务不会被压缩边界切断。

## 行为边界

- 生产默认仍使用 CC 风格的 `10K tokens / 5 text messages / 40K max tokens` 保留窗口。
- 测试和局部调用可以通过 options 显式降低阈值，方便验证边界行为。
- 短群聊如果整体低于保留窗口预算，会保持原文窗口，不强行制造压缩边界。
- 原始群聊 transcript 仍保留在 `group-messages/*.json`，preserved segment 只是边界账本，不删除原文。

## 验证

- `npm run check`
- `npm run build:backend`
- dist 记忆回归：
  - typed memory index
  - long-term log distillation
  - distillation quality
  - group typed memory context
  - global group memory context
  - preserved segment
  - partial compact / sidecar
  - PTL emergency / recovery
  - micro compact
  - compaction hooks
  - quality gate
  - integration
  - auto compaction

全部通过。
