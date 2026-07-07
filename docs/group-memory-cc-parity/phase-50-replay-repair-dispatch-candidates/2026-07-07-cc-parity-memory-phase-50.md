# Phase 50 - Replay Repair Dispatch Candidates

## 背景

本阶段继续长期目标：把 CCM 群聊记忆系统升级到接近 Claude Code 的压缩、恢复和上下文使用能力。

Claude Code 的相关对照点：

- `buildPostCompactMessages()` 会在压缩后显式重建下一轮可见消息，顺序包含 boundary marker、summary、保留窗口、附件和 hook 结果。
- Session Memory 与 memdir 召回不是隐藏状态，而是被整理成可注入 prompt 的稳定上下文。
- 子 Agent / teammate 在新会话中必须拿到压缩后的恢复状态，不能假定底层 CLI session 自动记得旧对话。

CCM 已在 Phase 48/49 把 compact boundary replay 的 repair action 物化为 per-group sidecar work items，并支持 claim / dispatch / complete / block / reopen。本阶段把这些 work items 进一步提升为主 Agent 可消费的 replay repair dispatch candidates。

## 目标

让已认领、已标记派发或高优先级的 replay repair work items 进入群聊主 Agent 的规划上下文，但不由 Memory Center 或诊断逻辑自动创建真实任务。

这保证：

- 多群聊按 `groupId` 分离读取自己的 sidecar。
- 主 Agent 下一轮规划能看到修复候选。
- 子 Agent 新会话能在记忆包中看到相关上下文。
- 打开 Memory Center / 运行诊断不会污染任务队列。

## 实现

### 后端候选摘要

新增 `buildReplayRepairMainAgentDispatchCandidates(groupId)`：

- 读取 `group-memory-replay-repair-work-items/<groupId>.json`。
- 选择以下候选：
  - `in_progress` 且 owner 为 `group-main-agent`。
  - 已记录 `dispatch_target`。
  - `pending` 且 priority 为 `critical` / `high`。
- 输出 schema：`ccm-replay-repair-main-agent-dispatch-candidates-v1`。
- 每个候选携带：
  - `candidate_id`
  - `work_item_id`
  - `targetProject` / `dispatch_target`
  - `priority`
  - `component`
  - `instruction`
  - `expected`
  - `prompt_patch`
  - `raw_recovery`
  - `recommendedAction`
  - `shouldCreateRealTask: false`

### 质量检查

新增 `replay_repair_dispatch_candidates` quality check：

- 检查已认领、已派发或高优先级 work item 是否进入候选队列。
- 进入 `buildMemoryQualityReport()`。
- 缺失时在 Memory Center 质量报告中暴露 gap。

### 上下文注入

协作记忆包新增 `readGroupReplayRepairDispatchCandidatesSummary()`，并注入：

- `bundle.compaction.replayRepairDispatchCandidates`
- `renderGroupMemoryContextBundle()` 的文本输出

主 Agent `runGroupOrchestrator()` 新增自动注入：

- 从当前 `group.id` 读取 sidecar。
- 在 LLM coordinator prompt 注入“群聊记忆 Replay 修复派发候选”。
- 规则 fallback 路径也把候选并入只读上下文。
- 注入文案明确：候选只作为规划上下文，不自动创建真实任务。

### Memory Center

Memory Center 的 Replay 区域新增 `Main Agent Dispatch Candidates`：

- 展示候选 target / priority / instruction / recommendedAction。
- 显示 `shouldCreateRealTask=false`，避免误解为已真实派发。

## 验证

新增自测：

- `runMemoryCenterReplayRepairDispatchCandidateSelfTest()`

覆盖：

- replay fail 物化 work item。
- claim + dispatch 后生成候选。
- 候选携带 dispatch target、prompt patch、raw recovery。
- `shouldCreateRealTask === false`。
- 子 Agent 记忆包渲染候选。
- 主 Agent prompt 收到候选。
- quality check 通过。

已运行：

- `npm run check`

后续需要继续保持：

- `npm run build:backend`
- `npm run build:mcp-feishu`
- `npm run build:frontend`
- `npm run test:chat-experience`
- Phase 48/49/50 replay repair selftests

## 边界

本阶段不直接创建真实任务，不直接启动 Claude Code / Cursor / Codex 子 Agent。

真实任务创建仍由群聊主 Agent 根据当前用户消息、任务来源、授权边界和 dispatch policy 决定。Replay repair dispatch candidates 只是补齐压缩后恢复链路中的可见上下文。
