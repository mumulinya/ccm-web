# Phase 47 - Child Agent Type Replay Matrix

## 背景

Phase 46 已经可以对多个历史 compact boundary 做只读 replay。下一步需要解决群聊里不同第三方子 Agent 的差异：Claude Code、Cursor、Codex 都可能是新的外部会话，它们对上下文恢复、文件线索、原始回溯和回执契约的风险不同。

本轮目标：同一个群聊记忆包不只给总体 replay score，还要按子 Agent 类型拆分评分和修复建议。

## 本轮完成

### 1. 子 Agent 类型 replay matrix

文件：`backend/modules/knowledge/memory-control-center.ts`

新增：

- `ccm-child-agent-type-replay-matrix-v1`
- `ccm-child-agent-type-replay-row-v1`
- `ccm-child-agent-type-replay-target-v1`
- `ccm-child-agent-type-replay-profile-v1`
- `ccm-child-agent-type-replay-matrix-report-v1`
- 质量检查 `child_agent_type_replay_matrix`

采样来源：

- `groups.json` 的 group members
- `memory.agentMemories`
- `memory.workerLedger`
- options targets

Agent type 归一化：

- `claude` / `claudecode` / `claude-code` / `cc` -> `claudecode`
- `cursor` -> `cursor`
- `codex` -> `codex`
- 其他值保留为清洗后的自定义类型

### 2. 类型 profile 检查

每个目标都会复用最新 `buildGroupCompactBoundaryReplayGate()`，但设置 `recordRepairLedger=false`，避免诊断矩阵污染 Phase 45 的 repair attempt ledger。

通用检查：

- 基础 replay 是否 ok
- `memoryUsed/memoryIgnored` 回执契约是否可见
- `postCompactCandidateUsage` 候选使用契约是否可见
- 压缩边界身份是否存在：`summaryChecksum` 或 `summarizedThroughMessageId`

类型特化检查：

- Claude Code：强调平台记忆优先级、边界和回执，不能依赖内置 session 记忆。
- Cursor：强调文件/验证候选，避免只收到抽象摘要。
- Codex：强调 raw recovery 或 summary checksum，便于新会话回溯。

### 3. Memory Center 接入

文件：`frontend/src/components/knowledge/MemoryCenter.vue`

新增面板：

- `子 Agent 类型 Replay`

展示：

- 总分
- agent type 数
- target 数
- weak type 数
- 每种类型的 score/status/gaps
- 每个目标项目的 profile score 与 replay score

### 4. 质量报告与总览告警

文件：`backend/modules/knowledge/memory-control-center.ts`

`buildMemoryQualityReport()` 增加：

- `evaluateChildAgentTypeReplayMatrix()`

`buildMemoryCenterOverview()` 增加：

- `childAgentTypeReplayMatrixReport`
- 系统告警 `child_agent_type_replay_matrix`
- 群聊级 weak group 告警与 health 升级

### 5. 子 Agent 受控记忆包携带类型摘要

文件：`backend/modules/collaboration/memory.ts`

新增：

- `ccm-child-agent-type-summary-v1`

子 Agent 记忆包现在会渲染：

- 子 Agent 类型数量
- 目标数量
- 每种类型包含哪些目标项目
- Memory Center 会按 Claude Code / Cursor / Codex 等类型分别 replay 的提示

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runMemoryCenterChildAgentTypeReplayMatrixSelfTest`
- `runMemoryCenterHistoricalCompactBoundaryReplaySelfTest`
- `runMemoryCenterCompactBoundaryReplayGateSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairPlanSelfTest`
- `runMemoryCenterCompactBoundaryReplayRepairLedgerSelfTest`
- `runMemoryCenterCompactionHookLedgerSelfTest`
- `runMemoryCenterCompactBoundaryTimelineSelfTest`
- `runMemoryCenterChildAgentMemoryReliabilitySelfTest`
- `runGroupPostCompactFirstDispatchMarkerSelfTest`

## 下一阶段候选

- Phase 48：把 replay repair action 自动落盘为 pending work item，让群聊主 Agent 可以主动派发修复任务。
- Phase 49：把 agent type replay matrix 与真实 post-compact candidate usage ledger 联动，判断不同子 Agent 类型是否真的使用了记忆候选。
- Phase 50：对历史边界做 drift audit，发现旧摘要与当前 typed MEMORY.md / raw transcript 的矛盾。
