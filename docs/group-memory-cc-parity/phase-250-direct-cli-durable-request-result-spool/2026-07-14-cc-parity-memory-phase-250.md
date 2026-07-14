# CCM 记忆系统 Phase 250：Direct CLI Durable Request/Result Spool

日期：2026-07-14

## 阶段目标

Phase 249 已为 memory dispatch ticket 建立 durable WAL，并能从 external runner 的 request/result 恢复。但生产正常路径仍由 CCM server 直接 spawn Claude Code、Cursor、Codex；旧 external runner daemon 并未常驻。direct CLI 若在 runner 返回后、delivery receipt 或 surfaced ledger 提交前崩溃，没有 durable result 可用于自动恢复，只能标记 `uncertain_after_crash`。

Phase 250 在不牺牲群聊流式输出的前提下，为 server direct CLI 增加同目录 request/result spool，使正常路径和 external fallback 都具备可恢复证据。

## 设计选择

没有把所有调用强制切到旧 external runner，原因是：

- 生产 external runner heartbeat 已过期，守护进程不常驻。
- external runner 只在任务结束后返回结果，会损失当前群聊实时 chunk。
- 现有 direct path 已有成熟的 managed process、SSE、tool loop 和 independent verification。

因此保留 direct execution，并在其外层增加 durable envelope：

```text
memory WAL dispatch_started
  -> direct request prepared
  -> OS child "spawn" event
  -> direct request running
  -> live stdout/SSE/tool loop/verification
  -> direct result fsync + rename
  -> task-agent delivery receipt
  -> surfaced ledger commit
```

## 新增协议

### Request

`ccm-direct-agent-dispatch-request-v1` 持久化到：

```text
~/.cc-connect/agent-runner/requests/adr_*.json
```

绑定字段：

- request ID
- transport=`server_direct_cli`
- project/workDir/runtime
- group/task/execution/`tas_*`
- 完整 prompt 与 SHA-256 checksum
- prepared/started/completed timestamp
- runner PID
- canonical record checksum

### Result

`ccm-direct-agent-dispatch-result-v1` 持久化到：

```text
~/.cc-connect/agent-runner/results/adr_*.json
```

绑定字段：

- 同一 request ID
- success/error/output checksum
- native session ID
- exit code/signal
- group/task/execution/`tas_*`
- prompt checksum
- started/completed timestamp
- canonical record checksum

request 和 result 都使用 temp + fsync + rename。恢复时重新计算 checksum，不信任内存中的 validation flag。

已完成的 terminal request/result pair 默认保留 14 天；启动恢复后执行有界清理。checksum、schema 或 request/result binding 无效的记录不会被自动删除，保留给审计处理。

## OS Spawn 强证据

request 创建只代表调用准备完成，不代表第三方 Agent 已接收 prompt。Phase 250 将两者严格区分：

- `prepared`：request 已持久化，但 OS 子进程尚未发出 `spawn` event。
- `running`：Node child process 发出真实 `spawn` event，持久化 `started_at` 与 PID。
- `done/failed`：结果已原子持久化。

`runManagedCommand` 新增 `onStarted`，只在 `child.once("spawn")` 时触发。群聊流式 raw spawn 使用同一事件。

`runnerStarted` 作为独立系统 witness 传回三条调用路径。以下情况不得创建 delivered receipt 或提交 surfaced ledger：

- 调用前已取消
- request 只到 `prepared`
- spawn 失败
- runtime tool gate 在启动前阻断
- result 缺少 started witness

专项测试证明 prepared-only request 即使存在 failure result，也保持 delivery count=0，并在恢复时进入 `uncertain_after_crash`。

## 三条真实路径

以下路径仅在 `TypedMemoryDispatchAdmission.required === true` 时设置 `durableDispatch`：

- 群聊主 Agent 流式 Worker
- 任务队列直接派发
- `/api/tasks/auto-assign`

普通项目调用、ignore-memory、无群聊类型化记忆调用和 Global Agent 不创建 group direct spool。

## 流式体验

群聊 direct CLI 仍保留：

- stdout chunk SSE
- pet/activity 更新
- native session capture
- tool call continuation
- independent project verification
- file change snapshot

durable result 在完整 tool loop 和 verification 结束后、`onDone` delivery receipt 回调前写入。因此崩溃恢复使用的是最终交付输出，不是中间 chunk。

## 启动恢复

Phase 249 recovery 已扩展为同时识别 `ar_*` external runner 和 `adr_*` direct spool：

1. 校验 request/result schema 与 canonical checksum。
2. 校验 request/result ID、prompt、group、`tas_*` 一致。
3. 校验 request 与 result 都有 started witness。
4. 校验 WAL prompt checksum 与持久 prompt 完全一致。
5. 从 task-agent memory snapshot 重建 `ccm-task-agent-memory-context-delivery-receipt-v2`。
6. 把 direct request ID 写入 receipt。
7. 幂等补提交 surfaced ledger，并将 WAL 封存为 `committed`。

重复启动不会增加 delivery count。

## Agent 边界

- 群聊记忆继续严格绑定 `groupId--gcs_*`。
- 每次项目子 Agent 任务继续严格绑定独立 `tas_*`。
- legacy/default 不可进入 WAL 或 direct spool 的记忆提交链。
- Global Agent 不设置 `durableDispatch`，不接收群聊正文、group ticket、group WAL 或 direct group spool。

## 主要实现文件

- `backend/agents/direct-dispatch-spool.ts`
- `backend/agents/execution-kernel.ts`
- `backend/server.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/memory.ts`
- `scripts/group-typed-memory-direct-dispatch-spool-selftest.mjs`
- `package.json`

## 验证记录

- Phase 250 direct dispatch spool：39/39
- Phase 249 durable dispatch WAL：39/39
- Phase 248 dispatch consume ticket：40/40
- Phase 247 delivery lease：50/50
- Phase 245 identity fencing：69/69
- session memory delivery evidence：通过
- session memory delivery fencing/concurrency：通过
- `npm run check`：通过
- `npm run build:backend`：通过

## 生产验证

- 服务：`http://localhost:3081`
- 生产进程：PID `11896`
- 首页与 `/api/groups`：HTTP 200
- `ccm-server.err.log`：0 bytes
- 三个真实群聊各保留一个活动 `gcs_*`
- `default`/legacy 会话：0
- 启动 pending memory WAL：0
- Phase 250 `adr_*` request/result 测试残留：0
- Global Agent 源码无 `durableDispatch` 引用

## 后续仍可增强

- 为 `adr_*` request/result 增加 Memory Center 可视化与人工 resolve action。
- 把 stdout/stderr 增量 transcript 也写入 bounded append journal，支持崩溃后诊断执行到哪一步。
- 对 direct spool 增加跨进程 cleanup lease，避免多个 CCM 实例同时清理 terminal records。
