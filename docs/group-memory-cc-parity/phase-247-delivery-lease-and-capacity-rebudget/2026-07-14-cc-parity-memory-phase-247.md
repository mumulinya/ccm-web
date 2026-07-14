# CCM 记忆系统 Phase 247：投递租约与模型容量重预算

日期：2026-07-14

## 阶段目标

本阶段对齐 Claude Code `collectSurfacedMemories(messages)` 的核心语义：只有真正进入当前子 Agent 消息流的记忆才算 surfaced，构建候选 attachment 本身不消耗去重记录和 60KB 会话容量。

同时修复模型上下文窗口下降时的类型化记忆预算漂移。WorkerContextPacket、typed-memory capsule、pending lease、checksum 与 trust contract 必须全部按当前可信模型窗口重建，旧容量胶囊不得通过容量 ACK。

## 稳定边界

- 群聊记忆继续严格按 `groupId--gcs_*` 隔离。
- 每个项目子 Agent 任务先创建独立 `tas_*`，再接收所属群聊当前 `gcs_*` 会话记忆。
- Global Agent 只接收全局记忆和群聊路由元数据，不接收群聊正文，也不创建 group delivery lease。
- `legacy`、`default` 和废弃旧会话不迁移，发现后直接删除。
- ignore-memory 请求不生成 capsule 或 lease，不写 surfaced 账本。

## 两阶段投递协议

### 1. Prepare

`buildAgentMemoryContextBundle` 只完成以下动作：

1. 从当前群聊会话召回最多 5 个 MEMORY.md 文档。
2. 按单文档 4096 UTF-8 bytes、200 行、当前模型 token 预算生成 delivery capsule。
3. 生成 `ccm-child-typed-memory-delivery-lease-v1`，状态固定为 `pending`。
4. 将 capsule 与 lease 绑定到 group、`gcs_*`、project、task、`tas_*`、compact epoch、query checksum。
5. 不调用 surfaced 账本，不增加 bytes、tokens、deliveryCount。

同一 `tas_*` turn、同一 compact epoch、同一 capsule 和 query 会得到稳定 lease ID；runner 重试不会生成第二次容量消耗。

### 2. Commit

`commitChildTypedMemoryDelivery` 只有在以下条件全部成立时才提交：

- Runtime Kernel 独立复算 capsule，`trusted_for_delivery === true`。
- capsule checksum、lease checksum 和 identity binding 全部匹配。
- group、`gcs_*`、project、task、`tas_*`、recall scope、compact epoch 全部一致。
- runner 已派发并返回。
- prompt 包含 capsule checksum，或已有强 memory delivery receipt 证明 snapshot 真正进入 prompt。

群聊流式 Worker 在 `recordTaskAgentMemoryContextDelivery(...).delivered === true` 后提交。任务队列和 `/api/tasks/auto-assign` 在 `ctx.callAgent` 返回后提交。runner 抛错、工具门禁失败、容量门禁失败和 prompt 绑定失败都不提交。

### 3. Idempotency

每个 recall scope 保存有界 `deliveryLeases`，最多 160 条。相同 lease ID 和 checksum 再次提交只记录 duplicate telemetry，不增加：

- surfaced document count
- delivered bytes
- delivered tokens
- delivery count

新 turn 产生新 lease，正常累计。新 compact epoch 使用新 recall scope，60KB surfaced 预算自然恢复。

## 模型容量重预算

Worker Handoff 在构建 WorkerContextPacket 前比较 capsule 的 `model_context_window` 与当前可信模型窗口。窗口下降时，只能继续缩小旧 capsule rows，不能从未投递候选中扩张内容。

公式保持：

```text
effective_max_tokens =
min(configured_max_tokens, max(1000, floor(model_context_window * 0.02)))
```

例如 200K 降到 32K：

```text
min(5000, max(1000, floor(32000 * 0.02))) = 1000 tokens
```

重预算会同步重建：

- capsule rows 和 UTF-8 byte/line/token 统计
- capsule checksum
- surfaced/recalled relPaths
- pending delivery lease 和 lease checksum
- WorkerContextPacket expected binding
- memory recall trust contract
- acceptance flags 和 context usage

`acknowledgeTaskAgentSessionCapacityRevalidation` 现在同时检查 packet capacity 与 typed capsule capacity。仍携带 200K capsule 的 32K packet 会以 `typed_memory_capsule_capacity_not_revalidated` fail closed。

## 安全属性

- 跨群聊、跨 `gcs_*`、跨 task、跨 `tas_*`、跨 compact epoch 的 lease 重放失败。
- 修改 lease identity 会同时破坏 lease checksum 和 capsule binding。
- 伪造 capsule 统计、内容、checksum 或模型预算继续由 Runtime Kernel fail closed。
- surfaced 账本只接受 capsule 中实际 delivered relPaths。
- Global Agent 不读取或提交群聊 delivery lease。

## 主要实现文件

- `backend/agents/runtime-kernel.ts`
- `backend/agents/worker-handoff.ts`
- `backend/tasks/agent-sessions.ts`
- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/collaboration.ts`
- `scripts/group-typed-memory-delivery-lease-selftest.mjs`
- `scripts/group-typed-memory-session-recall-selftest.mjs`
- `package.json`

## 验证记录

- Phase 247 delivery lease：46/46
- Phase 246 model-aware budget：42/42
- Phase 245 identity fencing：69/69
- Phase 244 delivery capsule：21/21
- Phase 243 session recall：20/20
- stale lifecycle：36/36
- semantic reference recall：20/20
- consumption feedback：18/18
- Runtime Kernel self-test：通过
- Worker Handoff self-test：通过
- `npm run check`：通过
- `npm run build:backend`：通过

## 与 Claude Code 的对齐结果

Claude Code 从当前消息数组中的真实 `relevant_memories` attachment 反推 surfaced 状态；compact 后旧 attachment 离开消息数组，去重与累计容量自然进入新边界。

CCM 不能直接观察第三方 CLI 内部消息数组，因此用 pending delivery lease + runner prompt witness 实现等价的两阶段语义：候选构建不计费，真实投递后计费，compact epoch 切换后恢复预算。该行为不再把“准备发送”误当成“已经进入大模型上下文”。

## 后续长期方向

长期目标保持 active。下一阶段继续对照 Claude Code 的 attachment 生命周期、prefetch 丢弃语义、compact 后消息重建和跨进程账本恢复，不把本阶段完成误判为整个记忆系统长期目标完成。
