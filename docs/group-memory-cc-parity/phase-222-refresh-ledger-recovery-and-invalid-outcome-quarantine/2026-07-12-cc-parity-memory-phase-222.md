# CCM CC-Parity Memory Phase 222

日期：2026-07-12

## 阶段目标

补齐模型容量刷新回执链的可恢复性和有界保留能力，避免损坏账本被误报为健康、非法 pending 永久卡住热队列，以及 journal archive 无限制增长。

本阶段继续服务于长期目标：群聊会话记忆和第三方子 Agent 上下文必须拥有可信、可恢复且可审计的模型容量边界。

## 已实现

### 1. 回执账本状态可区分

`readModelCapabilityRefreshOutcomeLedger` 现在明确返回：

- `present`
- `schemaValid`
- `checksumValid`
- `valid`
- `recoveryRequired`
- `recoveryReason`

缺失、JSON 损坏、schema 错误和 checksum 篡改不再被伪装成有效空账本。

### 2. 租约内自动重建与恢复证明

refresh maintenance 持有跨进程 lease 后会先检查旧账本。发现缺失或损坏时：

- 从 active journal 和仍在保留期内的 journal archives 重建回执账本。
- 在 journal 写入 `outcome_ledger_recovered`。
- 在 refresh status 写入 `ledgerRecovery`，包含原因、时间和旧账本校验状态。
- 重建发生在 journal rotation 之前，避免先截断再恢复造成证据丢失。

账本新增 `historySources`，记录 active journal 行数、archive 文件数和 archive 行数。

### 3. 非法 pending 原子隔离

非法 JSON 或错误 schema 的 pending outcome 不再留在热队列反复失败：

- 先通过同盘 rename 原子移出 pending 热目录。
- 写入 `ccm-model-capability-invalid-refresh-outcome-v1` 隔离信封。
- 保留原文件名、错误原因、原始内容、原始内容 checksum 和隔离时间。
- 默认状态为 `pending_ack`。
- journal 写入 `pending_outcome_invalid`。
- 隔离封装失败时尝试恢复原 pending 文件，不静默丢弃。

生产隔离目录：

`~/.cc-connect/memory-control/model-capability-refresh-outcome-invalid/`

### 4. 隔离确认账本

新增独立 checksum 保护的确认账本：

`~/.cc-connect/memory-control/model-capability-refresh-outcome-invalid-acknowledgements.json`

确认操作持有同一 refresh lease，并写入 `pending_outcome_acknowledged` journal 事件。确认只改变审计状态，不删除隔离取证文件。

新增 API：

- `GET /api/groups/memory/capabilities/invalid-outcomes`
- `POST /api/groups/memory/capabilities/invalid-outcomes/acknowledge`

Memory Center 展示待确认数量、隔离原因、取证 checksum 状态和逐条确认按钮。

### 5. Journal archive 双重保留

archive retention 与 outcome ledger、journal rotation 共用 refresh lease。

默认边界：

- 最多 50 个 journal archive。
- 最长保留 180 天。
- 先删除超龄 archive，再按最旧优先收敛数量。

refresh status 的 `archiveRetention` 包含 `scanned`、`deleted`、`expired`、`overflow` 和 `remaining`。

### 6. 坏 journal 行局部容错

journal 读取改为逐行解析。单个损坏行会被跳过，不再导致整个 journal 被当成空日志，从而保护 fencing token 计算、刷新计划和回执重建。

## 关键文件

- `backend/modules/collaboration/model-capability-cache.ts`
- `backend/modules/collaboration/group-routes.ts`
- `frontend/src/components/knowledge/MemoryCenter.vue`
- `scripts/model-capability-recovery-selftest.mjs`

## 专项验收

`model-capability-recovery-selftest.mjs` 使用全套临时路径验证 13 项：

- 缺失账本触发恢复。
- 恢复证明持久化。
- active journal 回执完整重建。
- retained archive 回执完整重建。
- checksum 篡改触发恢复。
- 篡改后账本恢复有效。
- 非法 pending 被隔离。
- pending 热队列清空。
- 隔离项进入待确认状态。
- 确认记录持久化。
- 确认后取证文件仍保留。
- archive 同时执行时间和数量保留。
- archive 最终不超过 50 个。

回归结果：

- Phase 222 恢复/隔离/保留专项：13/13。
- 模型容量、回执、降级和刷新回归：27/27。
- 真实双 Node refresh lease 竞争：6/6。
- TypeScript 检查通过。
- 后端生产构建通过。
- 前端生产构建通过。
- `git diff --check` 通过，仅存在仓库原有 LF/CRLF 提示。

## 运行态验收

服务地址：`http://localhost:3081`

生产检查：

- outcome ledger present：true
- outcome ledger valid：true
- invalid pending：0
- pending spool residue：0
- invalid quarantine residue：0
- archive remaining：0

## 不变量

1. 损坏或缺失账本不得宣称健康。
2. 回执重建必须读取 active journal 和仍受保留的 archives。
3. outcome、journal rotation、archive retention 和确认写入必须受 refresh lease 保护。
4. 非法 pending 不得永久占用热队列，也不得静默删除。
5. 确认隔离项不得删除原始取证材料。
6. 所有故障注入测试必须使用临时目录，不得删除生产 archive。
7. CCM 记忆系统长期目标继续保持 active，本阶段完成不代表长期目标结束。
