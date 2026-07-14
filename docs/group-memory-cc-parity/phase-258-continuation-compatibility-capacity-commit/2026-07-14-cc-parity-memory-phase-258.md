# CCM Memory CC Parity Phase 258

## 目标

把 Phase 257 的原生续接证据和容量重新预算补成 provider-aware、可两阶段提交、可在服务崩溃后恢复的真实派发闭环，消除两个风险：

1. 任何 provider 只要 `--resume` 返回 exit 0 就被误认为原生会话已续接。
2. 容量降级 gate 在 durable dispatch 建立前被清除，进程在两者之间崩溃后可能失去重建/重压缩约束。

固定边界不变：

- 群聊记忆只使用 `groupId--gcs_*`，多群聊和同群多会话相互隔离。
- 每个项目子 Agent 任务使用独立 `tas_*`，只注入当前群聊会话记忆。
- Global Agent 只接收全局记忆和路由元数据，不接收群聊正文，也不生成群聊子 Agent capacity commit receipt。
- `ignore memory` 不注入历史记忆；没有 typed-memory WAL 时只允许在 runner 已真实返回后提交容量证明。
- default、legacy、history 和废弃旧会话直接删除，不迁移、不恢复。

## Provider Continuation 能力矩阵

新增 `ccm-native-continuation-capability-profile-v1`，并将 runner evidence 升级为 version 2。不同第三方 Agent 不再共享一个宽松规则：

| Provider | Native resume | 可信确认方式 | Session ID 来源 | Native fork |
| --- | --- | --- | --- | --- |
| Claude Code | 支持 | 真实 `--resume` 成功退出，或 provider 返回同一 ID | CCM 预分配 | 不支持，退化为新 session + scratchpad |
| Codex | 支持 | JSON provider output 必须返回同一 thread ID | provider output | 不支持，退化为新 session + scratchpad |
| Cursor | 支持 | JSON provider output 必须返回同一 session ID | provider output | 不支持，退化为新 session + scratchpad |
| Gemini CLI | 不声明支持 | 不确认 | none | 不支持 |
| Qoder CLI | 不声明支持 | 不确认 | none | 不支持 |

证据新增：

- `continuationCapabilityProfile`。
- `resumeAckPolicy`。
- `sourceAllowedByProfile`。
- `compatibilityStatus`。

典型状态包括 `acknowledged`、`resume_evidence_insufficient`、`native_resume_unsupported` 和 `native_fork_unsupported`。未知 provider 默认 fail closed，不能借用 Claude Code 的 exit-success 语义。

## Capacity Revalidation 两阶段提交

### Prepare

`prepareTaskAgentSessionCapacityRevalidation()` 验证并持久化 `ccm-task-agent-session-capacity-revalidation-proof-v1`，绑定：

- `tas_*`、group、task、project 和 provider。
- capacity downgrade gate id/checksum。
- WorkerContextPacket id 和 memory checksum。
- 当前可信模型窗口、capacity evidence checksum 和 context usage 状态。
- typed-memory capsule checksum、窗口和 effective token budget。

Prepare 成功后 `capacityRevalidationRequired` 仍为 true，gate 不会被清除。旧 capsule、窗口仍过大、packet 缺失、整体仍 over budget 或 proof 被篡改都会拒绝。

### Commit

`commitTaskAgentSessionCapacityRevalidation()` 只接受两类 durable witness：

- 已进入 `dispatch_started`、`runner_returned` 或 `committed` 的 typed-memory dispatch WAL。
- 已真实启动并返回的 runner request。

Commit 成功生成 `ccm-task-agent-session-capacity-revalidation-commit-v1`，再清除 downgrade gate。缺少 witness 时保持 pending，不会把“已构建 packet”误报为“已派发”。

### 崩溃恢复

typed-memory dispatch WAL 新增：

- `capacity_revalidation_proof_checksum`。
- `recovery_payload.capacity_revalidation_proof`。

如果服务在 WAL `dispatch_started` 后、capacity commit 前崩溃，启动恢复会从 WAL 取回 proof、核验 `tas_*` 和 gate 后补交 commit receipt。若在 WAL 建立前崩溃，gate 保持 active，下一次派发必须重新 prepare。

## 真实派发接入

以下三条路径全部改为同一两阶段纪律：

- 群聊协作派发。
- direct task 派发。
- auto assign 派发。

每条路径都先 prepare；有 typed memory 时在 WAL started 后 commit，无 typed memory 时强制 durable runner 并在 runner return 后 commit。timeline 同时记录 proof 和 commit receipt，不再只写一条“已重建”文字日志。

## Memory Center

Task Agent Memory 新增：

- `capacityRevalidationPreparedCount`。
- `capacityRevalidationCommittedCount`。
- `capacityRevalidationPendingCount`。
- `capacityRevalidationInvalidCount`。
- provider policy rejected 和 unsupported fork 计数。

前端新增 `capacity commit` 卡片。pending 进入 warning，proof/receipt 校验失败进入 fail；`native resume` 卡片同时显示 policy rejected 数量。

## 验证

新增 `scripts/task-agent-continuation-capacity-commit-selftest.mjs`，专项结果为 33/33，覆盖：

- Claude Code exit-success resume。
- Codex 缺少返回 thread ID 时拒绝。
- Codex/Cursor 返回 ID 匹配与不匹配。
- Gemini resume unsupported。
- native fork unsupported 明确降级。
- prepare 不清 gate。
- 缺少 durable witness 拒绝 commit。
- proof 篡改拒绝。
- runner-return commit。
- WAL started 后崩溃恢复 commit。
- 三条真实派发路径和 Global Agent 边界。

相关回归全部通过：

- Phase 257 native continuation/rebudget：28/28。
- invocation adoption/reinjection：42/42。
- invocation recovery：32/32。
- invocation lineage：22 项全部通过。
- delivery lease：54/54。
- direct dispatch spool：39/39。
- typed-memory dispatch WAL：39/39。
- model-aware budget：42/42。
- model capability cache：全部通过。
- model capability recovery：全部通过。
- model capability refresh race：6 项全部通过。
- Memory Center 多会话隔离：13 项全部通过。
- `npm run check`：通过。
- `npm run build`：通过。

浏览器验收：

- 桌面 `1280x720`：document 1280/1280，记忆中心 985/985，无横向溢出。
- 手机 `390x844`：document 390/390，记忆中心 367/367，无横向溢出。
- 两种尺寸均显示 `native resume`、`re-budget`、`capacity commit`。
- 页面显示 `prepared 0 · pending 0 · invalid 0`，符合当前没有正式 invocation 的生产状态。
- console warning/error：0。

## 会话清理

生产重启后再次确认旧会话没有复活：

- `gmps7ha15` 仅 `gcs_mriu5m33_ahy0yo`。
- `gmqbz18hj` 仅 `gcs_mriu5m6i_2vpxc9`。
- `gmr02wpbv` 仅 `gcs_mriu5m94_sfq6ix`。
- 三个 manifest 都是 1 个 session、`legacy=false`。
- default、legacy、history 目录为 0。

## 生产状态

- 服务：`http://localhost:3081`。
- PID：`23668`。
- Memory Center overview：HTTP 200。
- Memory Center quality：HTTP 200。
- `.runtime-server.err.log`：0 字节。
- invocation lineage 正式制品：0。
- invocation recovery 正式制品：0。
- typed-memory dispatch WAL 正式制品：0。

## 后续方向

长期 CC parity 目标继续保持 active。下一阶段继续做真实长任务和服务重启 soak：让 provider resume profile、capacity commit receipt、压缩后记忆重注入和 invocation recovery 在多轮真实 runner 执行中形成连续证据链，并验证 provider CLI 升级导致输出格式变化时能够自动降级而不是误确认。
