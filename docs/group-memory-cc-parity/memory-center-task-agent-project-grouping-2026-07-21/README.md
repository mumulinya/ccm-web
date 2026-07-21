# Memory Center Task Agent Project Grouping

## Objective

让记忆中心的项目子 Agent 会话按权威项目身份分组，避免所有 `tas_*` 精确会话混排在同一个长列表中。

## Confirmed Behavior

- 侧栏层级固定为 `子 Agent -> 项目 -> tas_* 精确会话`。
- 每个项目可单独展开或收起，并显示该项目的会话数量。
- 会话按最近使用时间从新到旧排列。
- 会话主标签显示第三方运行时和短会话 ID，不再重复项目名前缀。
- 会话副标签继续展示当前 Token、自动压缩阈值、运行状态和执行轮次。
- 熔断告警、选中状态和精确会话详情读取保持不变。
- 没有项目绑定的旧会话统一归入“未关联项目”，不通过标签臆造项目身份。

## Data Flow

1. `task-agent-sessions.json` 是任务 Agent 会话项目归属的事实来源。
2. Memory Center API 显式投影 `projectId`、`projectLabel`、`taskAgentSessionId`、`taskId`、`groupId`、`agentType`、`status`、`turnCount` 和 `lastUsedAt`。
3. 前端只按 `projectId` 聚合，不使用截断后的展示标题判断项目。
4. 用户选择叶子节点后，仍以 `scope=task_agent&id=tas_*` 读取精确会话，不改变记忆隔离边界。

## Files

- `backend/modules/knowledge/memory-control-center-handler.ts`
- `frontend/src/components/knowledge/MemoryCenterPanel.vue`
- `scripts/memory-center-scope-hierarchy-selftest.mjs`
- `scripts/memory-center-task-agent-project-grouping-render-selftest.mjs`

## Verification

- Backend TypeScript production build passed.
- Frontend Vite production build passed.
- Memory Center hierarchy self-test passed with 27 checks.
- Live API exposed 10 sessions across 2 authoritative projects.
- Browser verification confirmed project counts `7 + 3`, independent collapse behavior, runtime labels, token/status metadata, and zero horizontal overflow.
- Dedicated real-data desktop/mobile rendering regression passed and saved screenshots plus `report.json` under `evidence/`.
- The older global-session rendering script still contains a stale hard-coded test session title (`你好呀`) that no longer exists after test-data cleanup; its failure is unrelated to this project grouping path.
