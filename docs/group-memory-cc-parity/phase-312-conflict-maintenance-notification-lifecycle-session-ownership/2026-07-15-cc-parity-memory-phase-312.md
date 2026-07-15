# CCM Memory Phase 312: Conflict Maintenance Notification Lifecycle Session Ownership

日期：2026-07-15

## 目标

把 conflict-resolution maintenance 的通知读取、群聊主 Agent 注入、delivery、ack/suppress receipt、scheduler state 和会话删除恢复链提升为严格的 `groupId + gcs_*` 所有权，同时继续保证全局 Agent 只使用全局上下文。

## 问题

Phase 311 已让后台 scheduler 发现并运行 `${groupId}--${gcs_*}`，但通知消费和生命周期仍有根级遗留：

1. scheduler 在 exact typed scope 生成通知，群聊主 Agent 却仍用裸 `groupId` 读取，导致通知已落盘但当前会话看不到。
2. delivery health 和 cleanup repair context 继续读取裸群聊目录，无法证明投递属于哪个 `gcs_*`。
3. scheduler state 虽使用 exact key，但删除群聊会话时不会同步清理主状态和 `.bak`。
4. 重启 tick 不会主动修剪 manifest 已消失的 stale exact scope。
5. 三个旧自测仍要求全局 Agent 接收群聊 maintenance advisory/repair context，与 global-only 架构相冲突。

## 实现

### Exact Notification Context

- maintenance scope 派生并持久化 `source_group_id`、`group_session_id`、`typed_scope_id`、`exact_session`。
- notification、receipt、delivery、health、maintenance run 和 status 均返回同一组会话所有权字段。
- 群聊主 Agent 根据当前 `groupSessionId` 构造 `${groupId}--${groupSessionId}`。
- notification context、delivery health 和 cleanup repair context 均从当前 exact scope 读取。
- 裸群聊读取不聚合 exact 通知，也不会看到兄弟会话提醒。

### Delivery 与 Receipt 隔离

- A/B 两个会话使用不同 notification、delivery 和 receipt 文件。
- delivery entry 使用 exact scope 参与 delivery ID 和 checksum 绑定。
- A 的 acknowledged receipt 只隐藏 A 当前 state fingerprint；B 的同逻辑通知仍保持 pending。
- 主 Agent prompt 显式携带 root group、`gcs_*` 和 typed scope，提醒仍是只读建议，不能自动创建任务、签发 GC approval 或删除数据。

### Scheduler 生命周期

- scheduler idempotency metadata 和 state row 保存 root group、session、typed scope 和 exact 标记。
- 每次 tick 根据当前 manifest discovery 修剪选定 root group 下已不存在的 exact state key。
- 新增会话删除清理函数，删除指定 `${groupId}--${gcs_*}` state。
- 清理后把当前 state 同步为 `.bak`，避免主文件损坏时恢复已删除会话。
- `deleteGroupSessionMemoryArtifacts()` 将 scheduler cleanup 纳入统一删除结果。

### Global-Only 边界

- 全局 Agent runtime 不注入群聊 maintenance notifications、delivery health 或 cleanup repair context。
- Memory Center 仍可直接扫描 global-audience 账本做只读质量审计，但扫描结果不进入全局 Agent prompt。
- 历史自测改为验证 global-only，而不是要求全局 Agent 消费多群聊 advisory。

## 主要文件

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/group-orchestrator.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/scheduling/cron.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/conflict-maintenance-notification-lifecycle-exact-session-restart-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:conflict-maintenance-notification-lifecycle-exact-session-restart
```

结果：14/14 通过。

覆盖：

- 同一群聊 A/B 两个 exact scope 分别运行 scheduler。
- A/B notification 和 delivery 使用独立物理文件。
- 群聊主 Agent 只读取当前 `gcs_*`，裸群聊 pending 为 0。
- A acknowledged 后 pending 为 0，B 仍为 1。
- receipt ledger 只在 A 生成，B 不被修改。
- scheduler state 两个 key 均携带 exact ownership。
- 删除 A 同时清理主 state 和 `.bak`，B 完整保留。
- 第二个 Node 进程重启后自动修剪伪造 stale scope，只运行 B。
- B 在重启后继续读取自己的 exact notification context。
- 持久化样本不包含 raw transcript body。

## 回归结果

- Phase 312 exact notification lifecycle restart：14/14。
- maintenance controller/notification/delivery/retention/recovery/cleanup/journal/lease/CAS/WAL/startup：12/12。
- cleanup repair lifecycle/resolution/startup discovery：3/3。
- Phase 311 repair completion maintenance：12/12。
- Phase 310 closure feedback exact session：13/13。
- Provider generation restart reconciliation：14/14。
- Group auto-compaction session scope：12/12。
- Global Agent global-only context：13/13。
- 完整 frontend、MCP Feishu、backend build：通过。

## 长期目标状态

Phase 312 完成，但 Claude Code 级记忆系统长期目标继续保持 active。当前整体约 99.97%；后续进入最终广域一致性审计，继续以多群聊、多会话、重启、删除和第三方子 Agent 上下文使用证据为准，不用局部绿测代替完整证明。

## 生产部署

- URL：`http://localhost:3081`
- PID：`35016`
- stdout：`C:\Users\admin\.cc-connect\logs\ccm-server-phase312.log`
- stderr：`C:\Users\admin\.cc-connect\logs\ccm-server-phase312.err.log`
- 首页：HTTP 200。
- Memory Center overview：成功，9 个群聊。
- targeted quality API：成功，notification context 和 delivery health 两项检查已注册。
- 当前生产没有 conflict-maintenance 样本，两项检查状态为预期 `empty`。
- scheduler state 当前无活动 scope，没有 legacy 聚合任务需要迁移。
- stderr：0 bytes。
