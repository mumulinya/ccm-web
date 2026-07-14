# CCM 记忆系统 Phase 248：Dispatch-Time Memory Consume Ticket

日期：2026-07-14

## 阶段目标

Phase 247 已将 surfaced 账本从 bundle 构建阶段延迟到 runner 返回阶段，但 pending lease 仍可能在真正发送前失效：task-agent turn 已变化、群聊发生 compact、旧 `gcs_*` 被删除、同 scope 的其他投递已经改变 60KB 预算，或最终 prompt 已不再是生成 capsule 时对应的 prompt。

Phase 248 对齐 Claude Code 的 memory prefetch consume point：预取结果不能直接算作消息 attachment；只有在 agent loop 的安全消费点，根据当前消息和状态重新过滤后，才可以进入模型上下文。

## Claude Code 对照依据

参考 `D:\claude-code\src\utils\attachments.ts` 与 `D:\claude-code\src\query.ts`：

- `startRelevantMemoryPrefetch` 每个用户 turn 只启动一次，并绑定 abort/dispose 生命周期。
- consume point 不等待未完成 prefetch；未 settled 时跳过，在下一 iteration 再尝试。
- `filterDuplicateMemoryAttachments` 在消费时按当前 `readFileState` 重新过滤。
- `collectSurfacedMemories(messages)` 从当前消息数组中的真实 attachment 反推 surfaced path 与累计 byte。
- compact 后旧 attachment 离开消息数组，去重与累计容量自然重置。

CCM 调用第三方 CLI，不能读取其内部消息数组，因此使用签名 consume ticket 表达“当前 packet 的这份记忆已经在调用 runner 前的最后安全点重新核验”。

## 三阶段协议

### 1. Prepare

`buildAgentMemoryContextBundle`：

- 召回 MEMORY.md 文档。
- 生成 bounded delivery capsule。
- 生成 pending delivery lease。
- 不消耗 surfaced 账本。

### 2. Admit / Consume

`admitChildTypedMemoryDelivery` 必须紧邻第三方 runner 调用，并重新验证：

- capsule 由 Runtime Kernel 独立复算且 `trusted_for_delivery === true`。
- lease checksum、capsule checksum 和 WorkerContextPacket identity 完全一致。
- 最终完整 prompt 包含 capsule checksum。
- lease `attempt_sequence` 仍对应当前逻辑 `tas_*` turn。
- 当前 group memory 的 compact epoch 与 lease 一致。
- 当前 recall scope 的 delivered bytes 仍等于 capsule 构建时快照。
- 所属 `gcs_*` 仍存在，`default`/legacy 会话不得派发。

验证通过后签发 `ccm-child-typed-memory-dispatch-ticket-v1`。ticket 绑定：

- lease ID/checksum
- capsule checksum
- WorkerContextPacket ID
- 完整 prompt SHA-256
- attempt sequence
- compact epoch
- admission timestamp
- `dispatch_not_after`
- consume point

ticket 默认要求签发后 30 秒内开始 runner 调用；runner 执行本身可以持续更久。旧 ticket 不能延迟重放。

### 3. Commit

`commitChildTypedMemoryDelivery` 现在必须同时收到：

- validated WorkerContextPacket
- pending lease
- dispatch consume ticket
- 精确 rendered prompt
- runner dispatch start timestamp
- runner 返回或强 delivery receipt

缺少 ticket、prompt hash 不一致、packet ID 不一致、dispatch start 超时或 ticket checksum 被篡改时全部 fail closed。只有 commit 成功才更新 surfaced docs、bytes、tokens 和 delivery count。

## Provider Retry

同一次逻辑 turn 的 provider fallback 可以为同一 lease 重新签发 ticket，因为最终 recovery prompt 与 Worker 调用时点已经变化。lease 仍保持幂等：

- 新 ticket 绑定新的完整 prompt。
- 已提交 lease 的 retry admission 标记为 `idempotentRetry`。
- retry commit 不重复增加 surfaced bytes 或 delivery count。

## 会话与 Agent 边界

- 群聊记忆继续使用 `groupId--gcs_*`。
- 每个项目子 Agent 使用独立 `tas_*`。
- 已删除 `gcs_*` 的旧 bundle 在 admission 阶段拒绝。
- `default`/legacy 会话不得签发 consume ticket。
- ignore-memory、无召回记忆和 Global Agent 不需要 group consume ticket。
- Global Agent 仍只接收全局记忆和群聊路由元数据，不接收群聊正文。

## 真实派发顺序

三条生产路径统一为：

```text
build bundle + pending lease
  -> build/validate WorkerContextPacket
  -> admitChildTypedMemoryDelivery
  -> call third-party runner
  -> delivery receipt / runner return
  -> commitChildTypedMemoryDelivery
```

覆盖：

- 群聊主 Agent 流式 Worker 派发
- 任务队列直接派发
- `/api/tasks/auto-assign`

## 主要实现文件

- `backend/agents/runtime-kernel.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/collaboration.ts`
- `scripts/group-typed-memory-dispatch-consume-ticket-selftest.mjs`
- `scripts/group-typed-memory-delivery-lease-selftest.mjs`
- `scripts/group-typed-memory-session-recall-selftest.mjs`
- `package.json`

## 验证记录

- Phase 248 dispatch consume ticket：40/40
- Phase 247 delivery lease：50/50
- Phase 246 model-aware budget：42/42
- Phase 245 identity fencing：69/69
- Phase 244 delivery capsule：21/21
- Phase 243 session recall：20/20
- stale lifecycle：36/36
- semantic recall：20/20
- consumption feedback：18/18
- session delivery evidence binding：通过
- Runtime Kernel：通过
- Worker Handoff：通过
- task dispatch regression：通过
- `npm run check`：通过
- `npm run build:backend`：通过

## 尚未冒充完成的部分

consume ticket 当前在 runner 调用进程内有效。如果进程在 runner 已接收 prompt 后、surfaced commit 前崩溃，仍缺少可跨进程恢复的 durable admission/start witness。下一阶段应增加 ticket WAL、runner request ID 绑定、启动恢复仲裁和过期 ticket 清理；在这些证据完成前，不能声称 crash recovery 已与 Claude Code transcript persistence 等价。
