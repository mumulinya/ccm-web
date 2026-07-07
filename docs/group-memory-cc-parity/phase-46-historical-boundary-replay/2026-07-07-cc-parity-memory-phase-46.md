# Phase 46 - Historical Compact Boundary Replay

## 背景

Phase 43-45 已经完成最新 compact boundary 的 replay gate、失败 repair plan、repair attempt sidecar ledger。下一步需要覆盖 Claude Code 风格压缩恢复里的一个更长尾问题：旧压缩边界不能只被记录在 `compaction.boundaries` 里，还要能被抽样重放，证明历史摘要边界仍然可以恢复到第三方子 Agent 的新会话上下文。

本轮做的是只读历史 replay，不改写旧边界，不写 repair ledger。它用于发现历史边界恢复能力是否退化。

## 本轮完成

### 1. 多历史 compact boundary replay

文件：`backend/modules/knowledge/memory-control-center.ts`

新增：

- `ccm-historical-compact-boundary-replay-v1`
- `ccm-historical-compact-boundary-replay-report-v1`
- `historical_compact_boundary_replay` 质量检查

实现要点：

- 从 `memory.compaction.boundaries` 和当前 `memory.compactBoundary` 收集最多 8 个历史边界。
- 按 `summaryChecksum` / `summarizedThroughMessageId` / `id` 去重。
- 对每个历史边界构造临时 memory snapshot：
  - 覆盖 `summaryChecksum`
  - 覆盖 `summarizedThroughMessageId`
  - 覆盖 token 指标
  - 优先使用边界内 `post_compact_restore.reinjectionPlan`
  - 否则继承当前 `compaction.postCompactReinject`
- 复用 `buildGroupCompactBoundaryReplayGate()` 执行渲染和 needle 检查。
- 设置 `recordRepairLedger=false`，确保历史 replay 不污染当前 repair attempt ledger。

### 2. Memory Center 详情接入历史 replay

文件：`backend/modules/knowledge/memory-control-center.ts`

`buildGroupPostCompactUsageDiagnostics()` 增加：

- `historicalBoundaryReplay`

单群聊详情现在可以同时看到：

- 最新边界 Replay Gate
- Replay Repair Plan
- Replay Attempt History
- 历史压缩边界 Replay

### 3. 系统质量报告与总览告警

文件：`backend/modules/knowledge/memory-control-center.ts`

`buildMemoryQualityReport()` 增加 `evaluateHistoricalCompactBoundaryReplay()`。

`buildMemoryCenterOverview()` 增加：

- `historicalCompactBoundaryReplayReport`
- 系统级告警 `historical_compact_boundary_replay`
- 群聊级告警和 health 升级

### 4. 子 Agent 上下文携带历史边界摘要

文件：`backend/modules/collaboration/memory.ts`

新增 `ccm-compact-boundary-history-summary-v1`：

- `boundaryCount`
- `latest`
- `rows`

子 Agent 受控记忆包现在会渲染：

- 历史压缩边界数量
- 最新历史边界 checksum / message id
- 提醒历史边界可由 Memory Center 多边界 replay 审计，必要时按 raw messages 回溯旧摘要

这让第三方 CC / Cursor / Codex 子会话知道 CCM 保存的是 bounded boundary history，而不只是当前摘要。

### 5. Memory Center 前端展示

文件：`frontend/src/components/knowledge/MemoryCenter.vue`

新增面板：

- `历史压缩边界 Replay`

展示：

- score
- boundaryCount
- replayedBoundaryCount
- passedBoundaryCount
- gapCount
- 每个历史边界的 replayStatus、score、passed/checked、gapCount

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runMemoryCenterHistoricalCompactBoundaryReplaySelfTest`
- `runMemoryCenterCompactBoundaryReplayGateSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest`
- `runMemoryCenterCompactionHookLedgerSelfTest`
- `runMemoryCenterCompactBoundaryTimelineSelfTest`
- `runMemoryCenterChildAgentMemoryReliabilitySelfTest`
- `runGroupPostCompactFirstDispatchMarkerSelfTest`

## 下一阶段候选

- Phase 47：按目标子 Agent 类型维度评分，例如 Claude Code / Cursor / Codex 各自 replay score。
- Phase 48：把 repair action 自动落盘为 pending work item，让群聊主 Agent 主动派发修复。
- Phase 49：历史 replay 与 post-compact candidate usage ledger 联动，判断旧边界候选是否仍被真实子 Agent 使用。
- Phase 50：对历史边界做 drift audit，发现旧摘要与当前 typed MEMORY.md / raw transcript 的矛盾。
