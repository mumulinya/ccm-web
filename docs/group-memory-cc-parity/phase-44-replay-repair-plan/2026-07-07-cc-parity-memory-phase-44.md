# Phase 44 - Compact Boundary Replay Repair Plan

## 背景

长期目标仍然是把 CCM 群聊记忆系统升级到接近 Claude Code 的记忆压缩、恢复和上下文使用能力。Phase 43 已经实现了压缩边界 Replay Gate，可以只读重放子 Agent 记忆包，验证压缩边界、重注入候选、hook ledger 和回执契约是否进入第三方子 Agent 的新会话上下文。

对照 `D:\claude-code` 后，本轮重点补上 Claude Code 风格的压缩后恢复闭环：

- `src/services/compact/postCompactCleanup.ts` 在压缩后集中清理和重载上下文相关缓存，避免压缩后继续使用旧状态。
- `src/tools/AgentTool/agentMemorySnapshot.ts` 会为新 Agent 初始化或提示更新持久记忆 snapshot。
- CCM 之前能发现 replay 缺口，但还缺把缺口转成明确修复动作的能力。

## 本轮完成

### 1. Replay Gate 自动生成 Repair Plan

文件：`backend/modules/knowledge/memory-control-center.ts`

新增 `ccm-compact-boundary-replay-repair-plan-v1`：

- replay 健康时生成 `status=ok`、`requiredActionCount=0`。
- replay 失败或 warning 时，根据 gaps 自动生成 actions。
- 支持按优先级排序：`critical`、`high`、`medium`。
- 会针对不同缺口给出不同修复目标：
  - `receipt_contract`：补齐 `memoryUsed/memoryIgnored` 回执契约。
  - `candidate_contract`：补齐 `postCompactCandidateUsage` 候选使用账本契约。
  - `boundary`：重建压缩边界索引。
  - `hook`：重载 compaction hook ledger。
  - `goal/constraint/fact`：从 raw transcript / typed MEMORY.md 补回群聊核心记忆。
  - `file/skill/verification/blocker`：补回 post-compact reinjection 候选。

Repair Plan 同时输出：

- `promptPatch`：可直接注入下一轮子 Agent 的修复提示。
- `rawRecovery`：指向 group memory 与 group messages 原始来源。
- `safeguards`：要求修复后重新 replay，候选必须按当前仓库核验，子 Agent 必须提交记忆使用回执。

### 2. 总览和质量报告聚合修复动作

文件：`backend/modules/knowledge/memory-control-center.ts`

- `buildCompactBoundaryReplayReport()` 增加 `overall.repairActionCount`。
- 报告增加 `topRepairActions`，用于快速看到最该修的 replay 缺口。
- `evaluateCompactBoundaryReplayGate()` 在 gaps 中携带第一条 repair action，质量报告不再只是说“缺字段”，而是给出具体修复方向。
- Memory Center 总览告警会显示 replay 缺口数和待修复动作数。

### 3. 子 Agent 记忆包支持渲染 Replay Repair Plan

文件：`backend/modules/collaboration/memory.ts`

子 Agent 受控记忆包渲染新增 `Replay Gate 修复计划` 段落。当未来 `memory.compaction.replayRepairPlan` 被写入群聊记忆时，第三方子 Agent 新会话会收到：

- repair plan 状态和分数。
- 最多 5 条优先修复动作。
- 修复前必须重新 replay 的要求。

这让 repair plan 不只停留在 Memory Center，而是可以成为子 Agent 上下文的一部分。

### 4. Memory Center 展示 Repair Plan

文件：`frontend/src/components/knowledge/MemoryCenter.vue`

- Replay Gate 卡片新增 `repair` 统计。
- Replay Gate 面板新增 `Replay Repair Plan` 列表。
- 每条 action 展示 priority、title 和 instruction。
- 移动端列表改为单列，避免文本挤压。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runMemoryCenterCompactBoundaryReplayGateSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
- `runGroupPostCompactFirstDispatchMarkerSelfTest`
- `runMemoryCenterChildAgentMemoryReliabilitySelfTest`
- `runMemoryCenterPostCompactDispatchMarkerTrendSelfTest`
- `runMemoryCenterCompactionHookLedgerSelfTest`
- `runMemoryCenterCompactBoundaryTimelineSelfTest`

## 下一阶段候选

- Phase 45 可以把 repair plan 从只读诊断升级成可持久化的 sidecar ledger，类似 hook ledger。
- 增加自动 re-run replay：repair action 完成后自动生成新的 replay attempt，形成 attempt history。
- 做多边界 replay：不只验证最近一次 compact boundary，也验证历史 boundary 的恢复能力。
- 按目标子 Agent 分维度评分：Claude Code、Cursor、Codex 子 Agent 可以有独立的 replay score 和 repair plan。
