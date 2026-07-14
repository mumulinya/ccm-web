# CCM 记忆系统 Phase 249：Durable Dispatch WAL 与崩溃恢复

日期：2026-07-14

## 阶段目标

Phase 248 已将类型化记忆的消费点移动到第三方 Agent runner 调用前，但 consume ticket、dispatch start 和 runner return witness 仍只存在于调用进程。进程若在 runner 已收到 prompt 后、surfaced ledger 提交前退出，重启后无法区分“尚未派发”“已派发但未返回”和“已返回待提交”。

Phase 249 将该协议升级为跨进程 durable WAL，并按用户确认的边界直接删除 `default`/legacy 旧会话，不做迁移。

## Claude Code 对照依据

参考：

- `D:\claude-code\src\QueryEngine.ts:439`：用户消息在进入 query 前先持久化 transcript。
- `D:\claude-code\src\QueryEngine.ts:691`：assistant/user/compact boundary 持久记录。
- compact 前持久化 preserved tail，重启后不依赖调用进程内临时状态。
- `D:\claude-code\src\utils\attachments.ts:2246`：surfaced memory 从真实消息 attachment 反推。

CCM 调用的是 Claude Code、Cursor、Codex 等第三方 Agent，不能读取其内部 transcript，因此用“prompt-bound ticket + durable WAL + runner request/result + session delivery receipt + surfaced ledger”形成等价的可审计证据链。

## Durable WAL

新增目录：

```text
~/.cc-connect/group-typed-memory-dispatch-wal/
  groupId--gcs_*/
    tmdt_*.json
```

每条 `ccm-child-typed-memory-dispatch-wal-v1` 固定绑定：

- group ID 与 `gcs_*`
- task ID 与 `tas_*`
- target project
- compact epoch 与 attempt sequence
- lease ID/checksum
- capsule checksum
- ticket ID/checksum
- WorkerContextPacket ID
- 完整 rendered prompt checksum
- platform dispatch ID
- execution ID
- external runner request ID
- delivery receipt ID/checksum
- revision 与 WAL checksum

WAL 仅接受 `groupId--gcs_*`。`default`、legacy、缺失 `tas_*` 的记录不能进入派发恢复协议。

## 状态机

```text
admitted
  -> dispatch_started
  -> runner_returned
  -> committed

admitted -> expired | cancelled
dispatch_started -> uncertain_after_crash | cancelled
runner_returned -> committed | uncertain_after_crash | cancelled
```

关键语义：

- `admitted`：ticket 已生成，尚未证明 runner 调用开始。
- `dispatch_started`：在调用第三方 Agent 前同步持久化。
- `runner_returned`：输出摘要、runner request ID、delivery receipt 已持久化，surfaced ledger 尚可重试。
- `committed`：surfaced docs/bytes/tokens/delivery count 已提交；大 recovery payload 随即释放。
- `uncertain_after_crash`：只有开始证据、没有强 runner return/receipt 证据，不猜测提交。
- 账本瞬时提交失败时保持 `runner_returned`，由启动恢复重试，不错误封存为 terminal failure。

## 原子性与多进程边界

- 每条 WAL 使用独立跨进程 lock file。
- lock 通过 `wx` 原子创建；本机 owner 进程死亡或超过 stale window 时才回收。
- 每次更新必须匹配上一 revision，旧进程不能覆盖新进程状态。
- 文件写入使用 temp + fsync + rename。
- 每条记录使用 canonical SHA-256 checksum。
- terminal WAL 默认保留 14 天后有界清理。

## Runner 证据绑定

外部 runner 请求创建时，`onRunnerRequestCreated` 立即回写 WAL，并继续使用 `registerExternalRunnerRequest` 绑定 execution：

```text
WAL dispatch_started
  -> agent-runner/requests/ar_*.json
  -> execution.externalRunnerRequestIds
  -> agent-runner/results/ar_*.json
  -> task-agent delivery receipt
  -> surfaced ledger commit
```

三条真实路径都把 `runnerRequestId` 写入 `ccm-task-agent-memory-context-delivery-receipt-v2`：

- 群聊主 Agent 流式 Worker
- 任务队列直接派发
- `/api/tasks/auto-assign`

直接任务和 auto-assign 也补齐了此前缺少的 task-agent memory snapshot 与 delivery receipt，不再只依赖函数返回布尔值。

## 启动恢复

`bootstrapServerRuntime` 在任务队列恢复前执行 `recoverChildTypedMemoryDispatchWal`：

1. checksum 或 `gcs_*`/`tas_*` 身份无效：阻断，不修改 surfaced ledger。
2. `admitted` 已过 `dispatch_not_after`：标记 `expired`。
3. 仅有 `dispatch_started` 且没有 runner return 强证据：标记 `uncertain_after_crash`。
4. external runner request/result 已持久化且 prompt、group、`tas_*`、execution 绑定一致：可重建 delivery receipt。
5. `runner_returned` 且 receipt checksum、packet ID、session ID 均有效：幂等补提交 surfaced ledger。
6. 已 `committed`：no-op；重复启动不增加 delivery count。

本地 direct CLI 若进程在 receipt 前崩溃且没有 external runner result，仍按不确定处理，不冒充已送达。这个边界比猜测提交安全，也保留了后续将 direct CLI 全部纳入可恢复 request spool 的演进空间。

## 旧会话删除策略

用户已确认旧会话无需保留。启动会话维护现在无论 archived retention 开关是否开启，都会执行 fleet 级 legacy purge：

- 强制删除每个群聊的 `default` 消息文件。
- 删除 `default` 对应 group memory、typed memory、compact boundary、tool continuity 与 sidecar artifacts。
- 不迁移正文，不把旧内容注入新 `gcs_*`。
- 群聊没有剩余会话时创建空白新 `gcs_*`。
- 新派发继续只接受 `groupId--gcs_*`。

策略标识：`delete_legacy_default_without_migration`。

## Global Agent 边界

- Global Agent 不使用 group dispatch ticket/WAL。
- Global Agent 只接收全局记忆和群聊路由元数据。
- 群聊正文、`gcs_*` session memory、项目子 Agent delivery receipt 不进入 Global Agent prompt。

## 主要实现文件

- `backend/modules/collaboration/typed-memory-dispatch-wal.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-session-maintenance.ts`
- `backend/tasks/agent-sessions.ts`
- `backend/server.ts`
- `scripts/group-typed-memory-dispatch-wal-selftest.mjs`
- `package.json`

## 验证记录

- Phase 249 durable dispatch WAL：39/39
- Phase 248 dispatch consume ticket：40/40
- Phase 247 delivery lease：50/50
- Phase 243 session recall：20/20
- `npm run check`：通过
- `npm run build:backend`：通过
- group session maintenance race：通过
- session memory delivery evidence/fencing：通过
- semantic recall：20/20
- consumption feedback：18/18
- stale lifecycle：36/36

## 生产验证

- 服务：`http://localhost:3081`
- 生产进程：PID `27672`
- 首页与 `/api/groups`：HTTP 200
- `ccm-server.err.log`：0 bytes
- 三个真实群聊均只有一个活动 `gcs_*`
- `default`/legacy 会话：0
- legacy default 侧文件：删除 20 个，迁移 0 个
- Phase 249 WAL 测试残留：0
- 当前 pending/recovery WAL：0
- Global Agent 源码无 group dispatch WAL/ticket 引用

## 后续仍可增强

- 将本地 direct CLI 也统一纳入 request/result spool，使进程崩溃后可恢复其真实 runner return，而不只对 external runner 做自动补回执。
- 为 WAL recovery 增加 Memory Center 可视化审计页和人工 resolve action。
- 将 WAL terminal retention、uncertain policy 和 direct CLI durable spool 策略开放为 Memory Center 高级设置。
