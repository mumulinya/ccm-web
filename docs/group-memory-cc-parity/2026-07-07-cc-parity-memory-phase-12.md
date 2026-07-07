# CCM Group Memory CC-Parity Phase 12

日期：2026-07-07

## 目标

对照 `D:\claude-code\src\services\compact\microCompact.ts` 和 `timeBasedMCConfig.ts`，补齐 CCM 群聊记忆的 time-based micro-compact 能力。

## 对照发现

Claude Code 的 time-based microcompact 会在最近 assistant 响应距离当前请求超过阈值时触发。此时服务端 prompt cache 大概率已经过期，继续发送完整旧工具结果只会浪费上下文，因此它会：

- 只处理 compactable tool results。
- 保留最近 N 个 compactable tool results。
- 将更旧的 tool result content 替换为 `[Old tool result content cleared]`。
- 不删除本地 transcript。
- 记录 tokens saved，并 suppress compact warning。

CCM 群聊里没有完全相同的 API tool_result block，但项目子 Agent / worker 回执、执行输出、文件和验证线索在语义上等价于 compactable results。

## 本次升级

- 新增 `GROUP_TIME_BASED_MC_CLEARED_MESSAGE`。
- `buildGroupMicroCompactPlan()` 支持 `timeBased` 配置：
  - `enabled`
  - `gapThresholdMinutes`
  - `keepRecent`
  - `now`
  - `force`
- 新增 `resolveGroupTimeBasedMicroCompact()`：
  - 根据最近 assistant/agent 输出时间计算 gap。
  - 仅清理旧 compactable Agent 输出。
  - 保留最近 N 条 compactable 输出。
- micro-compact record 新增：
  - `compactReason`
  - `timeBasedCleared`
  - cleared placeholder text
  - artifact hints 仍保留，供 post-compact reinjection 使用。
- 子 Agent 记忆包渲染会显示“时间触发 micro-compact”信息。
- 新增 `runGroupMemoryTimeBasedMicroCompactSelfTest()`。

## 行为边界

- 不修改 `group-messages/*.json` 原始 transcript。
- time-based micro-compact 只改变 CCM 生成的记忆/上下文包表达。
- 即使旧输出被 placeholder 替代，文件、Skill、验证、阻塞等结构化线索仍会进入 reinjection plan。
- 默认不启用 time-based micro-compact；需要通过 `timeBased.enabled` 或上层配置显式启用，避免无意改变现有压缩行为。

## 验证

- `npm run check`
- `npm run build:backend`
- `runGroupMemoryTimeBasedMicroCompactSelfTest()`
- dist 记忆回归全绿：
  - typed memory
  - log distillation
  - distillation quality
  - typed context
  - global group memory context
  - compact warning
  - preserved segment
  - time-based micro compact
  - partial compact / sidecar
  - PTL emergency / recovery
  - micro compact
  - hook
  - quality gate
  - integration
  - auto compact
