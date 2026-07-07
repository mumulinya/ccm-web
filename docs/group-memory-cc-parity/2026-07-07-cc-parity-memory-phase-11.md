# CCM Group Memory CC-Parity Phase 11

日期：2026-07-07

## 目标

对照 `D:\claude-code` 的 `autoCompact.ts`、`compactWarningState.ts` 与 token budget 文档，补齐 CCM 群聊记忆的上下文压力预警能力，让主 Agent、全局 Agent、项目子 Agent 都能看到“离 auto-compact / blocking 还有多远”。

## 对照发现

Claude Code 的上下文预警包含几个层级：

- `warning`：接近 auto-compact 阈值。
- `error`：更接近阈值，应该减少原文上下文或尽快 compact。
- `auto_compact`：达到自动压缩阈值。
- `blocking`：接近硬上限，新消息应阻止或先压缩。
- successful compaction 后会短暂 suppress warning，避免压缩后 token 计数未刷新时误报。

CCM 之前已有 context budget、PTL、auto compact，但缺少可持久化、可注入上下文的 warning state。

## 本次升级

- 新增 `calculateGroupCompactWarningState()`：
  - 计算 `ok / warning / error / auto_compact / blocking / suppressed`。
  - 记录 token usage、percent left、effective context window、auto compact threshold、warning/error/blocking thresholds。
  - 支持压缩后 `suppressed` 状态。
- 新增 `getGroupEffectiveContextWindow()`，对齐 CC 的“context window - reserved output”模型。
- `compactGroupConversationMemory()`：
  - 压缩前写入 `preCompactWarning`。
  - 未触发压缩时也会把 `contextPressureWarning` 写回 memory。
  - 压缩成功后写入 suppressed warning，避免刚压完立刻误报。
- `refreshGroupConversationMemorySnapshot()`：
  - 同步记忆快照也写入 warning state。
- `runGroupMemoryAutoCompactionNow()`：
  - 即使未 compact，也保存 warning-only memory patch。
- 子 Agent 记忆包、群聊主 Agent 记忆文本、全局多群聊记忆包都会渲染 context pressure warning。
- 新增 `runGroupMemoryCompactWarningSelfTest()` 覆盖 warning/error/auto/blocking/suppressed。

## 行为边界

- 默认模型仍按 `200K context - 50K reserved output - 13K auto buffer = 137K auto compact threshold`。
- blocking 默认是 effective context window 减 3K。
- 压缩后 warning 会以 `suppressed` 形式进入记忆，下一次 pressure sample 会重新计算真实状态。
- 该机制只影响记忆可见性和调度依据，不删除原始 transcript。

## 验证

- `npm run check`
- `npm run build:backend`
- `runGroupMemoryCompactWarningSelfTest()`
- dist 记忆回归全绿：
  - typed memory
  - log distillation
  - distillation quality
  - typed context
  - global group memory context
  - compact warning
  - preserved segment
  - partial compact / sidecar
  - PTL emergency / recovery
  - micro compact
  - hook
  - quality gate
  - integration
  - auto compact
