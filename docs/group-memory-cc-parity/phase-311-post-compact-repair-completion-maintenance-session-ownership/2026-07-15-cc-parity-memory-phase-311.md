# CCM Memory Phase 311: Repair Completion and Maintenance Session Ownership

日期：2026-07-15

## 目标

把 corrected-receipt 完成消费、completion typed MEMORY.md、Memory Center 质量报告和 conflict-resolution 后台维护提升为严格的 `groupId + gcs_*` 会话所有权，并验证进程重启后仍不会回退到裸群聊作用域。

## 问题

Phase 310 已让回执修复 work item、candidate 和 brief 按会话隔离，但完成链仍有三个旧的根级入口：

1. timeline binding 虽携带 `groupSessionId`，关闭 work item 时仍打开 `<group>.json`，exact sidecar 无法被真实回执关闭。
2. Memory Center 的 corrected-receipt completion 报告只读取裸 `groupId`，遗漏 `<group>/<gcs_*>.json`。
3. conflict-resolution scheduler 只从群聊列表发现裸 group manifest，重启后看不到 `${groupId}--${gcs_*}` 下的维护清单。

## 实现

### Corrected-Receipt Completion

- coordinator work-item 文件选择器支持 legacy `<group>.json` 和 exact `<group>/<gcs_*>.json`。
- timeline closure 从 binding 提取并规范化 `gcs_*`，只打开对应 exact sidecar。
- 完成后的 ledger、timeline proof 和 corrected-receipt proof 均持久化 `groupSessionId` / `group_session_id`。
- 相同群聊的两个会话可使用相同 work-item、brief、task、assignment 和 dispatch 标识，仍分别完成且不会交叉关闭。
- 完成后自动 distill 到 `${groupId}--${groupSessionId}`，不创建裸群聊 typed-memory 副本。

### Memory Center Completion Consumption

- 新增 completion scope discovery，支持显式 group/session 参数和 exact work-item sidecar 目录扫描。
- receipt-consumption、completion typed-memory 和 fresh WorkerContext usage 报告统一按 exact scope 枚举。
- 报告返回 root `groupId`、`groupSessionId`、`scopeId`、`typedScopeId`、`exactSession`。
- 无完成行的 exact scope 仍保留占位诊断，不会静默回退到 legacy 数据。
- 三项质量检查均在 A/B 两个会话中独立达到 `ok`。

### Conflict-Resolution Maintenance Discovery

- 新增 exact maintenance scope discovery，从 typed-memory 目录扫描 conflict-resolution manifest。
- scope 必须同时通过 manifest 存在性和 distillation ledger 所有权校验。
- scheduler 接收 root group 后扩展为实际 exact scope，并以 exact scope 作为持久化 state key。
- maintenance runner 默认使用扩展后的 scope 列表，并报告 root、exact 和 legacy 数量。
- 重启后仅发现 `${groupId}--gcs_a` 与 `${groupId}--gcs_b`，不会生成裸 `groupId` 维护任务。

### 生命周期隔离

- 删除一个群聊会话时，其 work item、typed docs 和 maintenance ledger 被清理。
- 兄弟会话的 completed work item、completion rows、typed docs、manifest 和 maintenance ledger 保持不变。
- 持久化账本只保存结构化证明，不写入 raw transcript body。

## 主要文件

- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/scheduling/cron.ts`
- `scripts/post-compact-repair-completion-maintenance-exact-session-restart-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:post-compact-repair-completion-maintenance-exact-session-restart
```

结果：12/12 通过。

覆盖：

- A/B 两个 `gcs_*` 使用相同逻辑任务标识，各自关闭 exact work ledger。
- corrected-receipt 内层完成证明携带 exact session。
- completion rows 和 row ID 按会话区分，裸群聊 archive 保持为空。
- Memory Center 三项完成链质量报告按两个 exact scope 枚举并通过。
- 第二个 Node 进程在同一 HOME 下重启，自动发现并维护两个 exact scope。
- scheduler state 仅使用 exact scope key。
- 删除 A 后 B 的完成记忆和维护状态完整保留。
- 所有持久化样本保持 body-free。

## 回归结果

- Phase 311 repair completion + maintenance restart：12/12。
- Phase 310 closure feedback exact session：13/13。
- Phase 309 Provider ranking memory usage repair：14/14。
- Phase 308 completion preservation closure：14/14。
- Phase 307 replay-repair feedback distillation：13/13。
- Provider generation restart reconciliation：14/14。
- Group auto-compaction session scope：12/12。
- Global Agent global-only context：13/13。
- legacy corrected-receipt completion selftest：11/11。
- 完整 frontend、MCP Feishu、backend build：通过。

## 长期目标状态

Phase 311 完成，但 Claude Code 级记忆系统长期目标继续保持 active。当前整体约 99.95%；后续继续审计 exact conflict-maintenance notification、后台生命周期所有权和最终广域一致性，不把全局 Agent 接入任何群聊上下文。

## 生产部署

- URL：`http://localhost:3081`
- PID：`10752`
- stdout：`C:\Users\admin\.cc-connect\logs\ccm-server-phase311.log`
- stderr：`C:\Users\admin\.cc-connect\logs\ccm-server-phase311.err.log`
- 首页：HTTP 200。
- Memory Center overview：成功，9 个群聊。
- Phase 311 targeted quality API：成功，3 项检查均已注册。
- 当前生产无 corrected-receipt completion 样本，targeted quality 状态为预期 `empty`。
- receipt/typed-memory 报告已枚举 185 个 scope，其中 52 个 exact session、133 个 legacy scope；未发生自动迁移或跨 scope 写入。
- stderr：0 bytes。
