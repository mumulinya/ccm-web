# CCM Group Memory CC Parity Phase 4

日期：2026-07-07

## 本次目标

继续把 CCM 群聊记忆系统向 Claude Code 风格的会话记忆压缩靠拢，补齐两类高压场景能力：

- partial compact：允许主 Agent 只把群聊历史压缩到指定 message id，后续消息继续保留原文窗口。
- PTL emergency：在上下文接近极限或显式开启时，进入紧急降级模式，使用更短的摘要渲染和完整元数据，而不修改原始群聊 transcript。

## 已实现

- 在 `backend/modules/collaboration/group-memory-compaction.ts` 增加：
  - `GROUP_PARTIAL_COMPACT_VERSION`
  - `GROUP_PTL_EMERGENCY_VERSION`
  - `resolvePartialCompactWindow()`
  - `buildGroupPtlEmergencyPlan()`
- `compactGroupConversationMemory()` 支持 `partialCompact` 参数：
  - 当前稳定支持 `direction: "up_to"`。
  - 可通过 `messageId`、`throughMessageId`、`untilMessageId` 或 index 类字段选择边界。
  - 压缩区间为上一次压缩边界之后到所选 message 为止。
  - 所选边界之后的群聊消息仍作为 raw recent window 保留。
- PTL emergency 现在会写入：
  - `memory.compaction.ptlEmergency`
  - `memory.compactBoundary.ptlEmergency`
  - `memory.compactBoundary.post_compact_restore.ptlEmergency`
  - `memory.messageCompression.ptlEmergency`
  - `context_budget.ptl_emergency`
- PTL emergency 不删除、不改写原始 messages，只记录 raw transcript path、message ids、压缩范围和恢复策略。
- PTL emergency 启用时，`messageDigest` 会使用更短的 `messageDigestMaxChars` 渲染。
- 子 Agent 受控记忆包现在会展示：
  - partial compact 是否启用或跳过
  - selected boundary/message id
  - PTL emergency level、reason、raw transcript recovery path

## 设计边界

- Phase 4 当前只把 `partialCompact.direction = "up_to"` 作为稳定能力。
- `from` / 中间区间压缩会改变现有“旧前缀摘要 + 近期原文窗口”的模型，暂不伪装支持；后续需要独立设计稀疏区间摘要或多边界索引。
- PTL emergency 是上下文降级和元数据策略，不是原文清理策略。

## 新增自测

- `runGroupMemoryPartialCompactSelfTest()`
  - 验证压缩边界停在 `m30`。
  - 验证 `m31` 之后仍保留原文。
  - 验证 sentinel 进入摘要。
  - 验证原始 messages 不变。
- `runGroupMemoryPtlEmergencySelfTest()`
  - 验证 PTL metadata 写入 compaction、boundary、messageCompression。
  - 验证 health 为 `ptl_emergency`。
  - 验证 `messageDigest` 被限制在紧急预算内。
  - 验证质量门禁仍通过。
  - 验证原始 messages 不变。

## 后续增强方向

- 多边界 partial compact：支持 `from`、`range`、按 task id 压缩。
- 长期日志蒸馏：把群聊 transcript 的长期事实定期蒸馏进 typed memory，并保留引用和去重账本。
- PTL 自动恢复：当上下文压力下降后，允许摘要渲染从 emergency digest 恢复到 normal digest。
