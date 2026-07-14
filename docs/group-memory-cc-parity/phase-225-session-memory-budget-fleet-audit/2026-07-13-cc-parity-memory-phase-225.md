# Phase 225：Session Memory 模型预算与全会话审计

日期：2026-07-13

## 目标

把群聊 Session Memory 从“文件存在即可”升级为按真实模型上下文预算管理，并让 Memory Center 对每个 `groupId::gcs_*` 会话独立审计。Global Agent 继续只使用全局记忆与路由/任务状态，不读取群聊会话正文。

## Claude Code 对齐基线

参考：

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `MAX_SECTION_LENGTH = 2000`
- `MAX_TOTAL_SESSION_MEMORY_TOKENS = 12000`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`
- 初始化阈值 10000 tokens，更新增量 5000 tokens，3 次工具调用

CCM 不再按文件 MB 大小决定摘要是否可用。Session Memory 使用中英文保守 token 估算，每个 section 最多 2000 tokens，整份最多 12000 tokens；原始 transcript 永不因摘要裁剪而删除，仍是回溯权威。

## 完成内容

### 1. Session Memory 预算器

- 快照版本升级为 v2。
- 新增 `analyzeGroupSessionMemoryBudget()` 与 `enforceGroupSessionMemoryBudget()`。
- 快照持久化 `markdownTokens`、总预算、section 预算、利用率和越界 section。
- 生成摘要时按 Summary、Requirements、Facts、Decisions、Worker State 等语义区块分配预算。
- 旧快照读取时按实际 `summary.md` 重新计算，避免信任陈旧统计。
- `hasSummary` 覆盖目标、摘要、持久要求、事实锚点、决策、Worker 状态、开放问题和后续动作；fallback checksum 同时绑定这些语义内容。

### 2. 全会话 Fleet 审计

- `buildGroupSessionMemorySnapshotReport()` 枚举 scoped memory，而不是只扫描旧群聊根 JSON。
- 同一群聊的每个 `gcs_*` 会话各占一行，带 `scopeId`、memory/snapshot/summary 路径和 token 使用。
- 汇总 sessions、covered、fleet tokens、单会话最大 tokens、over/near budget、legacy default。
- sidecar 自身 `hasSummary=true` 即进入审计，修复主 memory JSON 字段被重算后误判 `empty` 的盲区。
- 超预算产生 critical alert；旧 `default` 会话产生 warning。

### 3. Agent 上下文边界

- 群聊主 Agent 与项目子 Agent 可使用所属 `groupId::gcs_*` Session Memory。
- 新创建的第三方子 Agent 会话只接收当前群聊会话记忆，不接收同群其他会话内容。
- `buildAgenticContext()` 验证 `policy=global_memory_only_group_session_content_excluded`、`group_session_context_included=false`。
- `/api/global-agent/group-memory` 保留为技术诊断端点，但不代表内容进入 Global Agent 模型上下文。

### 4. Memory Center

- 新增 “SESSION MEMORY FLEET / 群聊会话记忆预算” 面板。
- 展示会话数、覆盖数、fleet tokens、最大会话、超预算、legacy default。
- 展示每个 `gcs_*` 的群聊、summary 路径和 `tokens / 12000`。
- 已验证桌面响应式布局，无重叠和异常截断。

### 5. 会话删除

- 删除会话会同步删除该会话 memory、Session Memory、typed memory、compact boundary 与热 sidecar。
- 专项测试证明删除会话 A 不影响同群聊会话 B。
- 生产数据没有 `default` 会话；按用户授权删除 `gmps7ha15::gcs_mrhk9qcz_zkwcvm` 旧空会话，共删除 9 个关联产物。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npm run build`：前端、MCP Feishu、后端全部通过。
- `node scripts/group-session-memory-budget-fleet-selftest.mjs`：12 项通过。
- `runMemoryCenterGroupSessionMemorySnapshotSelfTest()`：8 项通过。
- `node scripts/group-session-sidecar-isolation-selftest.mjs`：14 项通过。
- `node scripts/group-memory-boundary-journal-selftest.mjs`：14 项通过。
- `node scripts/group-memory-resume-integration-selftest.mjs`：7 项通过。
- `node scripts/memory-center-session-scope-selftest.mjs`：5 项通过。
- model capability cache/recovery/refresh race 三组回归：全部通过。

生产验收：

- 服务：`http://localhost:3081`
- PID：`26644`
- `groupSessionMemoryFleetReport.sessionCount = 3`
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`
- `maxObservedSessionTokens = 230`
- 页面显示 3 个独立 `gcs_*` 行。

## 后续方向

长期目标保持 active。下一阶段继续对照 Claude Code Session Memory 的初始化/增量更新节奏、模型驱动摘要质量、compact 后重注入证据，以及真实第三方子 Agent 的 `memoryUsed/memoryIgnored` 回执覆盖率。
