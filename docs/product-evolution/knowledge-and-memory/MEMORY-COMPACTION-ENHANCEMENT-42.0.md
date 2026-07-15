# Memory Compaction Enhancement 42.0

日期：2026-07-05

## 目标

对照 `D:\claude-code` 的 compact 设计，补齐 CCM 在全局 Agent、群聊主 Agent、项目记忆和运行时上下文里的统一 token 预算、token-aware recent window、micro-compact、压缩边界记录、压缩后关键上下文回灌和验证证据。

## Claude Code 对照依据

- `D:\claude-code\src\services\compact\autoCompact.ts`
  - 有效上下文窗口扣除输出预算后再触发自动压缩。
  - `AUTOCOMPACT_BUFFER_TOKENS = 13_000`，并有 warning / blocking buffer 和连续失败 circuit breaker。
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
  - recent window 不是固定条数，而是按 token 下限/上限保留。
  - 不跨 compact boundary，并保护 `tool_use` / `tool_result` 成对关系。
- `D:\claude-code\src\services\compact\microCompact.ts`
  - 在完整 compact 前先释放旧工具结果、媒体等高成本上下文。
  - micro-compact 需要可追踪 token 节省和可回溯来源。
- `D:\claude-code\src\services\compact\compact.ts`
  - compact 后保留恢复预算：`POST_COMPACT_TOKEN_BUDGET = 50_000`、最多恢复 5 个近期文件、单文件 5K token、skills 预算 25K。

## CCM 实现

### 统一 token 预算

新增 `backend/context-budget.ts`：

- `DEFAULT_CONTEXT_WINDOW_TOKENS = 200_000`
- `DEFAULT_RESERVED_OUTPUT_TOKENS = 20_000`
- `DEFAULT_AUTO_COMPACT_BUFFER_TOKENS = 13_000`
- `estimateTextTokens()`：统一中英文 token 估算。
- `buildContextBudget()`：输出 `estimated_tokens`、`max_tokens`、`pressure`、`compact_recommended`、warning/blocking/auto thresholds。
- `microCompactText()`：保留首尾、记录压缩前后 token，并写入可回溯 marker。

接入点：

- `backend/agent-runtime-kernel.ts`
- `backend/global-agent-memory.ts`
- `backend/modules/group-memory-compaction.ts`
- `backend/project-memory.ts`
- `backend/modules/memory-control-center.ts`

### 全局 Agent 记忆

`backend/global-agent-memory.ts`：

- recent window 从固定最后 24 条升级为 token-aware 保留：
  - 最小目标：`RECENT_MIN_TOKENS_TO_KEEP = 10_000`
  - 最大目标：`RECENT_MAX_TOKENS_TO_KEEP = 40_000`
  - 仍保留 24 条基础 recent 语义，避免短消息过早丢失工作上下文。
- archive 增加 `microCompact`：
  - `compactedMessages`
  - `tokensBefore`
  - `tokensAfter`
  - `contentHash`
- session boundary 增加：
  - `preCompactTokenCount`
  - `postCompactTokenCount`
  - `preservedMessageCount`
  - `preservedTokenCount`
  - `context_budget`
  - `post_compact_restore`
- `post_compact_restore` 记录：
  - `filesAndResources`
  - `references`
  - `missionIds`
  - `sourceMessageIds`
  - `recentMessageIds`
- `buildGlobalAgentMemoryPacket()` 会把压缩边界、恢复锚点和 recent 回灌写进全局 Agent 上下文包。

### 群聊主 Agent 记忆

`backend/modules/group-memory-compaction.ts`：

- 群聊压缩改用统一 token budget 和 auto compact threshold。
- `buildBoundedRecentGroupContext()` 使用 `microCompactText()`，长消息显示 micro-compact marker，原始消息仍可按 message id 回溯。
- compact boundary 增加：
  - `preCompactTokenCount`
  - `postCompactTokenCount`
  - `context_budget`
  - `post_compact_restore`
- `post_compact_restore` 记录：
  - `preservedMessageIds`
  - `summaryChecksum`
  - `transcriptPath`

`backend/modules/collaboration.ts`：

- 群聊主链路的近期上下文窗口改为 `buildBoundedRecentGroupContext()`。
- 群聊记忆包展示 `compactBoundary` 和 token pressure，主 Agent / 子 Agent 能看到当前压缩状态。

### 项目记忆

`backend/project-memory.ts`：

- 项目记忆版本升级到 `PROJECT_MEMORY_VERSION = 3`。
- conclusion / decision compact boundary 增加：
  - `preCompactTokenCount`
  - `postCompactTokenCount`
  - `preservedRecentItems`
  - `context_budget`
  - `post_compact_restore`
- `post_compact_restore` 记录：
  - recent conclusion task ids
  - recent decision ids
  - archive ids
  - files modified anchors
- `buildProjectMemoryPacket()` 和 `buildProjectExecutionBrief()` 会展示压缩边界、恢复锚点、归档回灌和历史证据召回。

## 验证记录

已通过：

```text
npm run check
npm run build:backend
node -e "const m=require('./ccm-package/dist/project-memory.js'); const r=m.runProjectMemorySelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/modules/group-memory-compaction.js'); const r=m.runGroupMemoryCompactionSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"
node -e "(async()=>{const m=require('./ccm-package/dist/modules/group-memory-compaction.js'); const r=await m.runGroupMemoryCompactionIntegrationSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)})()"
node -e "(async()=>{const m=require('./ccm-package/dist/modules/group-memory-compaction.js'); const r=await m.runGroupMemoryCompactionStressSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)})()"
node -e "const m=require('./ccm-package/dist/global-agent-memory.js'); const r=m.runGlobalAgentMemorySelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/global-agent-memory.js'); const r=m.runGlobalAgentMemoryStressSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/agent-runtime-kernel.js'); const r=m.runAgentRuntimeKernelSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1)"
node -e "const m=require('./ccm-package/dist/modules/memory-control-center.js'); const r=m.runGlobalMemoryControlSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1)"
```

关键覆盖：

- 全局 Agent：加密转录、无损恢复、token-aware boundary、micro-compact 大输出记录、压缩后恢复锚点、压力下多轮压缩边界递进。
- 群聊主 Agent：bounded recent window、micro-compact marker、旧原文证据自动回溯、连续 12 轮压缩不漂移、boundary history 有界。
- 项目记忆：结论/决策归档校验、篡改检测、归档证据召回、压缩边界 token pressure、post compact restore anchors。
- 运行时：worker packet 使用统一 context budget，memory control center 使用统一上下文窗口计算 token pressure。

## 后续注意

- CCM 当前实现是“摘要 + recent + 锚点回灌”，不是 Claude Code 那种真实重新读取近期文件正文的 full restore attachment。项目执行简报会注入文件结构、git 状态、项目记忆和归档证据；如果后续要进一步贴近 Claude Code，可增加最近读取文件内容的受预算重读附件。
- 群聊 Agent 消息为文本结构，不存在 Claude Code 原生 `tool_use` / `tool_result` block；当前保护策略是不跨已记录 boundary、保留 receipt / dispatch evidence、按 message id 回溯原文。
