# Phase 226：Session Memory 初始化与增量更新节奏

日期：2026-07-13

## 目标

对齐 Claude Code Session Memory 的自动提取节奏，避免 CCM 在每次普通 `saveGroupMemory()` 时无条件重写会话摘要。每个群聊 `gcs_*` 会话拥有独立、可持久化、可跨服务重启恢复的初始化阈值、更新游标和提取次数。

## Claude Code 对照

参考源码：

- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`

对齐规则：

- `minimumMessageTokensToInit = 10000`
- `minimumTokensBetweenUpdate = 5000`
- `toolCallsBetweenUpdates = 3`
- token 增量门槛始终必须满足。
- 满足 token 增量后，累计 3 次工具调用可触发更新。
- 满足 token 增量后，最后一个 Assistant 回合没有工具调用时，可在自然对话停顿触发更新。
- 手动摘要/显式记忆保存可以绕过自动阈值。

## 实现

### 1. 每会话持久状态机

新增 `ccm-group-session-memory-update-cadence-v1`：

- `initialized`
- `currentContextTokens`
- `tokensAtLastExtraction`
- `tokensSinceLastExtraction`
- `toolCallsSinceLastExtraction`
- `lastAssistantTurnHasToolCalls`
- `tokenThresholdMet`
- `toolCallThresholdMet`
- `naturalBreak`
- `lastObservedMessageId`
- `lastExtractionMessageId`
- `extractionCount`
- `lastExtractedAt`

状态写入每个 scoped Session Memory `snapshot.json`。低于初始化阈值时只写 cadence snapshot，不创建 `summary.md`；服务重启后继续使用原游标。

### 2. 自动与手动更新分流

- 自动 `buildGroupContextPacket()` 路径使用 cadence decision。
- 未到阈值时保留原有 summary，不重写 markdown。
- 到阈值时生成新 snapshot/summary，并原子推进 token/message 游标。
- 相同上下文重复构建不会增加 extraction count，也不会改变 summary checksum/generatedAt。
- 显式 `saveGroupMemory()` 仍视为手动更新，立即保存用户要求、事实、决策等语义内容。

### 3. Snapshot v3

`GROUP_SESSION_MEMORY_SNAPSHOT_VERSION` 从 v2 升为 v3，新增 `updateCadence`。读取旧快照时仍按实际 summary 重新计算预算，并在后续会话观察时补齐 cadence。

### 4. Memory Center

Fleet 报告新增：

- initialized session 数量
- waiting initialization/update 数量
- overdue 数量
- 累计 extraction 数量
- 每会话 cadence status、当前 token、上次提取 token、增量 token、工具调用和最后提取时间
- CC 阈值 `10000 / 5000 / 3`

页面新增 `initialized` 与 `extractions` 卡片；会话行展示 cadence 状态和 token 增量。

### 5. Agent 边界

- cadence 仍按 `groupId::gcs_*` 隔离。
- 会话 A 的 token、工具调用和提取游标不会影响会话 B。
- Global Agent 不读取群聊 Session Memory 正文，原有边界不变。
- 项目子 Agent 只在摘要已提取或手动保存后接收所属会话 Session Memory；阈值前使用近期原文窗口。

## 验证

- `npm run build`：前端、MCP Feishu、后端全部通过。
- `node scripts/group-session-memory-update-cadence-selftest.mjs`：15 项通过。
- Phase 225 budget/fleet：12 项通过。
- Phase 224 sidecar isolation：14 项通过。
- compact boundary journal：14 项通过。
- resume integration：7 项通过。
- Memory Center session scope：5 项通过。
- 内置 Session Memory snapshot 自测：8 项通过。

专项覆盖：

- 9999 tokens 不初始化。
- 10000 tokens 在自然停顿提取。
- 增长 4999 tokens 时，即使工具调用超过 3 次也不更新。
- 增长 5000 tokens 后，2 次工具调用且最后回合仍在用工具时不更新。
- 增长 5000 tokens 后，3 次工具调用触发更新。
- 增长 5000 tokens 后，自然停顿可触发更新。
- 同一上下文重复构建不重复提取。
- 两个 `gcs_*` 会话状态互不污染。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`22796`
- 会话数：3
- `cadenceWaitingInitializationCount = 3`
- `cadenceInitializedSessionCount = 0`
- `totalSessionMemoryExtractionCount = 0`
- `cadenceOverdueCount = 0`
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`

现有 3 个空会话已安全回填 cadence 状态，均为 `waiting_initialization_tokens`、`currentTokens=0`，没有修改群聊正文或伪造摘要。

## 后续方向

长期目标保持 active。下一阶段继续对齐 Claude Code 的隔离 Session Memory 提取执行：顺序化并发门禁、in-progress/stale/timeout 状态、失败不推进游标、成功后才提交 summary 与 extraction cursor，并为真实第三方子 Agent 提供可审计的提取来源与回执。
