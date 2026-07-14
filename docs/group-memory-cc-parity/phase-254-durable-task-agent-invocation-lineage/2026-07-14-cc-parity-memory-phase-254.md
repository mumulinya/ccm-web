# CCM Memory CC Parity Phase 254

## 目标

将 Phase 253 的单次摘要交付证明扩展为可持久化的项目子 Agent 调用谱系。每次 spawn、resume、同 provider 恢复、provider switch 和 fork 都必须拥有独立、可校验、不可跨会话复用的 invocation edge，并把同一个 edge 绑定到记忆 bundle、WorkerContextPacket、prompt、snapshot、摘要胶囊和真实 runner request。

固定边界保持不变：

- 群聊记忆仅允许 `groupId--gcs_*`。
- 每次项目子 Agent 任务使用独立 `tas_*`，并接收所属群聊当前会话记忆。
- Global Agent 只使用全局记忆和群聊路由元数据，不接收群聊正文、摘要胶囊或调用谱系。
- `default`、legacy 和废弃旧会话直接删除，不迁移、不复活。
- `ignore memory` 不生成或注入调用谱系记忆上下文。

## Claude Code 对照

本阶段继续对照：

- `D:\claude-code\src\utils\agentContext.ts`
- `D:\claude-code\src\utils\sessionStorage.ts`
- `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts`

Claude Code 的 Agent invocation context 会记录 `agentId`、调用方 request id 和 `invocationKind=spawn|resume`，并在每次 resume 更新边界。Session JSONL 使用 `parentUuid` 组织恢复链和 sidechain；fork、compact boundary 和 resume 都显式处理父链，避免悬空引用、错误分叉或把旧链误当当前上下文。

CCM 调用第三方 Agent，无法依赖 provider 内部 transcript，因此本阶段在 CCM 自身建立 durable invocation edge ledger，并将其绑定到真正发送给 provider 的记忆上下文。

## 实现

### Durable Invocation Ledger

新增 `backend/tasks/task-agent-invocation-lineage.ts`：

- 文件隔离：`groupId--gcs_*--tas_*.jsonl`。
- append-only event ledger，使用 canonical SHA-256 event checksum 和 previous-event hash chain。
- 文件锁、过期锁回收、原子追加和读取校验。
- edge 身份包含 group、group session、task、project、`tas_*`、execution 和 provider attempt。
- 图身份包含 edge、parent edge、root edge、branch、parent branch 和 expected lineage head。
- 调用类型支持 spawn、resume；分支支持 main、native recovery、provider switch 和 fork。
- 生命周期支持 prepared、context bound、dispatched、runner request bound、completed 和 failed。
- dispatch 幂等；父 edge 缺失、自引用、身份不一致和 lineage head 漂移均 fail closed。

### Context 全链绑定

调用谱系被独立提升并绑定到：

- `buildAgentMemoryContextBundle()` 的 bundle 与 rendered prompt。
- Phase 253 post-turn summary delivery capsule。
- `WorkerContextPacket` 顶层字段和 packet identity。
- task Agent memory context snapshot。
- admission capsule、dispatch 和 runner request。

谱系不依赖摘要是否存在。即使当前没有逐轮摘要，只要是真实群聊项目子 Agent 调用，bundle、packet、prompt 和 snapshot 仍携带 invocation binding。`ignore memory` 和 Global Agent 均不携带此 binding。

### Retry、恢复与 Provider Switch

同 runtime native recovery：

- 保持同一个 `tas_*`。
- 创建新的 child edge。
- 标记 `branch_kind=native_recovery`。
- 重新构建 bundle、packet、prompt、snapshot 和 admission context。

provider switch：

- 创建新的 `tas_*`。
- 创建新的 branch，并保留 parent edge、parent branch、retry edge 和 fork reason。
- 使用新 provider、新 `tas_*` 和新 edge 全量重建记忆上下文。

专项检查发现早期 fallback 路径虽然创建了新 `tas_*`，但仍可能复用旧 bundle、packet、prompt、snapshot 和 admission capsule。该路径已修复，切换 provider 后不再复用任何旧身份上下文。

### Snapshot 与 Memory Center

task Agent snapshot 现在持久化 edge、parent/root、branch 和 lineage head，并核对 snapshot、摘要胶囊与 ledger 是否属于同一身份。

Memory Center 的 Task Agent Memory 面板新增：

- invocation edges、valid 和 invalid。
- branch count、retry count 和 provider switch count。
- 列表中的 edge、branch kind 和 terminal status。

手机端全局告警长文本增加 `min-width:0`、`overflow-wrap:anywhere`，并在 `<=760px` 使用两列布局，避免告警正文撑出容器。

### 会话删除语义

`deleteGroupSessionMemoryArtifacts(groupId, gcs_*)` 会同步删除该群聊会话下所有 task Agent invocation lineage 文件。群聊删除、归档清理和 retention prune 都复用这一公共入口。

旧会话不迁移。删除一个 `gcs_*` 后，其记忆、typed memory、摘要、边界制品和 invocation lineage 一并消失。

## 专项验证

新增 `scripts/task-agent-invocation-lineage-selftest.mjs`，使用隔离的临时 `HOME/USERPROFILE`，22/22：

- root spawn edge 持久化。
- resume parent/root 连接。
- 同 runtime native recovery。
- provider switch 创建新 `tas_*` 和新 branch。
- fork 保持稳定 parent。
- dispatch 幂等。
- runner request、packet、prompt、snapshot 和摘要胶囊绑定。
- 跨 group、`gcs_*`、`tas_*`、branch 拒绝。
- missing parent、自引用和 lineage head drift 拒绝。
- fallback 全链重建。
- ignore-memory 与 Global Agent 无 lineage。
- 公共群聊会话删除入口同步删除 lineage。
- 原始 transcript 不修改。

专项报告：

- edges：5。
- valid：5。
- invalid：0。
- branches：3。
- retries：3。
- provider switches：1。

回归结果：

- `npm run check`：通过。
- `npm run build`：通过。
- Phase 254 invocation lineage：22/22。
- Phase 253 post-turn summary delivery capsule：20/20。
- typed-memory dispatch consume ticket：40/40。
- typed-memory delivery capsule：21/21。

视觉验收：

- 桌面 `1440x1000`：document `scrollWidth=clientWidth=1440`；5 条告警和 10 张 Task Agent 卡片均无内部溢出。
- 手机 `390x844`：document `scrollWidth=clientWidth=390`；告警为 `7px + minmax(0,1fr)` 两列；告警和 Task Agent 卡片内部溢出均为 0。
- 手机 Task Agent Memory 面板实际宽度约 309.6px，左右均位于 viewport 内，2 列卡片稳定显示。
- 浏览器 console warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`8752`。
- Memory Center overview：HTTP 200。
- 群聊会话：1 个真实 `gcs_*`；legacy/default：0。
- 当前逐轮摘要：1；missing turns：0；invalid ledgers：0。
- 当前生产 task snapshot：0，因此 invocation edges、invalid 和 branch 均为 0；新项目子 Agent 派发开始后会生成。
- 生产 invocation lineage 文件：0；Phase 254 自测残留：0。
- `.runtime-server.err.log`：0 bytes。

## 后续方向

长期目标继续保持 active。下一阶段继续对照 Claude Code 的 sidechain resume、fork transcript adoption 和 dangling-parent repair，将 invocation ledger 扩展为可恢复的运行时重放/修复协议：进程崩溃后识别 prepared/dispatched 未终结 edge，依据 provider request 和 dispatch WAL 做确定性恢复，同时不突破群聊会话隔离和 Global Agent 正文隔离边界。
