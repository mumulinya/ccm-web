# Phase 45 - Replay Repair Ledger and Attempt History

## 背景

Phase 44 已经让 compact boundary replay gate 在失败时生成 `Replay Repair Plan`，把缺失的子 Agent 上下文字段转成可执行修复动作。本轮继续向 Claude Code 式压缩恢复闭环推进：修复计划不能只停留在一次性的 Memory Center 诊断里，它需要有 sidecar ledger，记录 replay attempt、失败历史、重复刷新去重和成功后的当前状态。

这对应 Claude Code 压缩后状态管理里的一个关键思想：压缩不是单点动作，而是有清理、重载、恢复、验证和历史痕迹的状态机。

## 本轮完成

### 1. 新增 Replay Repair Sidecar Ledger

文件：`backend/modules/knowledge/memory-control-center.ts`

新增目录：

- `group-memory-replay-repair/<groupId>.json`

新增 schema：

- `ccm-compact-boundary-replay-repair-ledger-v1`
- `ccm-compact-boundary-replay-repair-ledger-summary-v1`

Ledger 记录每次 replay attempt：

- `attempt_id`
- `target_project`
- `status`
- `score`
- `rendered_hash`
- `checked/passed`
- `candidate_count`
- `gap_count`
- `required_action_count`
- `repair_status`
- `boundary`
- `actions`
- `prompt_patch_hash`
- `raw_recovery`
- `seen_count`
- `last_seen_at`

### 2. Attempt 去重与当前 open action 语义

相同 group、target、boundary、rendered hash、status、score 的 replay 会更新同一条 attempt：

- 不重复新增记录。
- `seen_count` 增加。
- `last_seen_at` 刷新。

如果之后 replay 变成 `ok`：

- 历史失败 attempt 仍保留。
- 当前 `openActionCount` 归零。
- `historicalReworkRequiredCount` 仍可追踪过去失败次数。

这避免了 Memory Center 刷新造成账本膨胀，也避免已恢复的历史失败继续被误报为当前未修。

### 3. Replay Report 聚合 ledger 统计

文件：`backend/modules/knowledge/memory-control-center.ts`

`buildCompactBoundaryReplayReport()` 现在额外聚合：

- `repairAttemptCount`
- `openRepairActionCount`

每个 replay row 也携带 `repairLedger` 摘要，用于 Memory Center 展示历史和趋势。

### 4. 子 Agent 上下文读取 Replay Ledger

文件：`backend/modules/collaboration/memory.ts`

真实子 Agent 记忆包现在会读取：

- `group-memory-replay-repair/<groupId>.json`

并在受控记忆包里渲染：

- replay attempt 总数。
- 当前 open action 数。
- 最新 replay 状态/分数。
- 最近 3 条 attempt。
- sidecar ledger 文件路径。

这样第三方子 Agent 新会话不仅能看到修复计划，还能知道这个群聊的压缩恢复上下文是否刚刚失败过、是否已经恢复、是否反复出现同一缺口。

### 5. Memory Center 展示 Attempt History

文件：`frontend/src/components/knowledge/MemoryCenter.vue`

Replay Gate 面板新增：

- repair 卡片显示 attempt 数。
- `Replay Attempt History` 列表。
- 每条 attempt 展示 status、score、target、rendered hash、required action count、seen count。

移动端列表改为单列，避免文本拥挤。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runMemoryCenterCompactBoundaryReplayGateSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest`
- `runMemoryCenterCompactionHookLedgerSelfTest`
- `runMemoryCenterCompactBoundaryTimelineSelfTest`
- `runMemoryCenterChildAgentMemoryReliabilitySelfTest`
- `runGroupPostCompactFirstDispatchMarkerSelfTest`

## 下一阶段候选

- Phase 46：多历史 compact boundary replay，不只验证最近一次压缩边界。
- Phase 47：按目标子 Agent 类型维度评分，例如 Claude Code / Cursor / Codex 各自 replay score。
- Phase 48：repair action 自动落盘为 pending work item，群聊主 Agent 可主动派发修复。
- Phase 49：replay ledger 与 post-compact candidate usage ledger 联动，判断修复后候选是否真正被子 Agent 使用。
