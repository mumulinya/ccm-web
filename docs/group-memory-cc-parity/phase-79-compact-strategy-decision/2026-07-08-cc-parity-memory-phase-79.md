# Phase 79 - Compact Strategy Decision

## 目标

对照 `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`、`microCompact.ts`、`postCompactCleanup.ts`，补齐 CCM 群聊记忆压缩的策略决策产物：每次群聊记忆压缩、跳过压缩、partial sidecar、PTL emergency/recovery 都要能解释为什么选择该策略，并把这个解释作为子 Agent 新会话上下文和 Memory Center 治理对象。

## 已完成

- 新增 `ccm-group-compact-strategy-decision-v1`。
- 决策字段覆盖：
  - `mode`：`normal_compact`、`micro_compact`、`partial_compact`、`partial_sidecar`、`ptl_emergency`、`ptl_recovery`、`recent_window_only`、`skip_below_threshold`。
  - 压缩窗口：`startIndex`、`keepIndex`、`messagesToSummarize`、`keptMessages`。
  - token 压力：`preCompactTokenCount`、`postCompactTokenEstimate`、`triggerTokens`、`tokenPressurePercent`、`reductionRatio`。
  - 恢复线索：`summaryChecksum`、`transcriptPath`、`preservedSegment`。
  - 策略组件：`microCompact`、`partialCompact`、`ptlEmergency`、`ptlRecovery`。
  - invariants：任务事务不被切断、tool_use/tool_result 不被切断、thinking block 不被切断、保留窗口已记录。
- `compactGroupConversationMemory()` 已在以下路径写入决策：
  - 正常主压缩。
  - 低压力跳过压缩。
  - recent-window-only。
  - partial sidecar only。
- `refreshGroupConversationMemorySnapshot()` 同步快照路径也会写入决策。
- 子 Agent 记忆包 `renderGroupMemoryContextBundle()` 会渲染压缩策略决策、raw transcript、invariant 风险。
- Memory Center 新增 `compact_strategy_decision` 质量项。
- 群聊详情新增 `postCompactUsage.compactStrategyDecision`。
- 前端 Memory Center 新增“压缩策略决策”治理面板。
- 旧压缩边界支持 `legacy inferred`：历史群聊没有原生策略决策时，会从已有 boundary/compaction 字段推断一个可审计决策，避免老数据把新质量项打成失败；后续真实压缩会持久化原生决策。

## 验证

- `npm run build:backend`
- `npm run check`
- `npm run build`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runGroupCompactStrategyDecisionSelfTest`
- `runMemoryCenterCompactStrategyDecisionSelfTest`
- `buildMemoryQualityReport({ checkIds: ['compact_strategy_decision'], refresh: true })`

## 结果

Phase 79 已完成。当前长期目标仍未整体完成；本阶段补齐的是 Claude Code 风格 compaction decision path，让群聊记忆不只是能压缩，还能解释、回放和被 Memory Center 质量治理。

## 下一步候选

- 对照 Claude Code `apiMicrocompact.ts` 的 API 级 edit/clear 语义，进一步增强 CCM 的工具结果清理与保留策略。
- 对照 `postCompactCleanup.ts`，补齐压缩后派生缓存、临时状态、技能/工具上下文的 cleanup/rebuild 审计。
- 给 legacy inferred 决策增加一键 backfill 操作，把推断决策写回旧群聊记忆文件。
