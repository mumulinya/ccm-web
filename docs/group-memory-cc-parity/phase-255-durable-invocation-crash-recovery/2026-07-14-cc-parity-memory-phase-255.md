# CCM Memory CC Parity Phase 255

## 目标

将 Phase 254 的 durable task Agent invocation lineage 升级为可在进程崩溃后确定恢复、对账和修复的调用图。恢复必须依赖真实 dispatch WAL、runner request/result 和 checksum 证据，不能把“进程已消失”猜测成任务成功。

固定边界保持不变：

- 群聊记忆仅使用 `groupId--gcs_*`，多个群聊和同一群聊的多个会话相互隔离。
- 每个项目子 Agent 任务使用独立 `tas_*`，并注入所属群聊当前 `gcs_*` 的记忆。
- Global Agent 只接收全局记忆和路由元数据，不接收群聊正文或项目子 Agent 调用谱系。
- `ignore memory` 不注入历史记忆，也不建立记忆调用绑定。
- `default`、legacy、废弃会话和旧测试会话直接删除，不迁移、不复活。

## Claude Code 对照

本阶段继续对照 Claude Code 的 Agent invocation context、session sidechain、resume/fork parent 链和崩溃恢复边界。CCM 无法依赖第三方 provider 内部会话作为唯一事实源，因此在自身建立三方证据协议：

1. invocation edge 描述逻辑调用图和父子关系。
2. typed-memory dispatch WAL 描述真正获准并开始的记忆派发。
3. direct runner request/result 描述第三方 Agent 的实际执行证据。

只有证据相互绑定且 checksum 有效时，恢复器才确定终结调用；证据不足时保持 `active`、`uncertain`、`abandoned` 或 quarantine。

## 实现

### 调用边与派发 WAL 绑定

`backend/tasks/task-agent-invocation-lineage.ts` 的 edge 新增：

- dispatch ticket id 和 checksum。
- WAL 文件、record checksum、WAL state。
- platform dispatch id、runner request id 和 terminal witness。
- 最多 32 层的 `parent_ancestry` checksum 祖先快照。

群聊协作派发、direct task 和 auto assign 三条真实路径都写入这些字段。runner request 创建后先更新 WAL，再将最新 WAL checksum 写回 edge，避免 edge 指向过期 revision。

### 确定性崩溃恢复

新增 `reconcileTaskAgentInvocationRecovery()`：

- 有效 runner result 自动恢复为 completed 或 failed。
- runner PID 仍存活时保持 active。
- runner 已死亡但没有结果时标记 uncertain，绝不猜测成功。
- prepared 且没有 dispatch witness 时标记 abandoned。
- committed、cancelled、expired、uncertain WAL 可确定终结对应 edge。
- WAL、edge、runner 身份或 checksum 不一致时 fail closed 并 quarantine。

每个 `groupId--gcs_*` 拥有独立 append-only recovery history 和带 checksum 的 latest status。恢复历史不会跨群聊、跨 `gcs_*` 或跨 `tas_*` 合并。

### Parent 修复

dangling parent 只允许重连到 `parent_ancestry` 中 checksum 匹配的最近存活祖先。找不到可靠祖先时进入 quarantine。

父 edge 因已验证 recovery relink 改变 checksum 后，恢复器可以级联更新 child expected head；普通 head drift 仍然拒绝，避免借恢复流程掩盖篡改或跨链引用。

### 启动、删除与 Memory Center

服务启动顺序为：

1. `recoverChildTypedMemoryDispatchWal()`。
2. `reconcileTaskAgentInvocationRecovery()`。
3. `resumeTaskQueues()`。

因此任务队列恢复前，WAL 和 invocation graph 已完成对账。

删除群聊会话时，公共入口会同步删除 invocation lineage、recovery history/latest 和该 `groupId--gcs_*` 的 typed-memory dispatch WAL 目录。旧会话仍直接删除，不进行迁移。

Memory Center 的 Task Agent Memory 面板新增：

- recovered、uncertain、quarantine。
- live edges、pending 和 nonterminal。
- orphan parent、relinked parent。
- 有记录时展开 `Invocation Recovery` edge 明细。

WAL 枚举同时修复了与会话删除并发时的目录消失 TOCTOU；子目录刚被删除时视为空，不再抛出 `ENOENT`。

## 验证

新增 `scripts/task-agent-invocation-recovery-selftest.mjs`，Phase 255 为 32/32：

- checked 6。
- recovered 4。
- uncertain 1。
- active 1。
- relinked 2。
- quarantined 0。

覆盖 runner 成功/失败恢复、存活 PID、死亡 runner uncertain、abandoned prepared edge、cancelled WAL、durable recovery audit、checksum status、dangling parent 重连、descendant checksum 级联、会话删除、启动顺序和 Global Agent 隔离。

顺序回归结果：

- `npm run check`：通过。
- `npm run build`：通过。
- Phase 254 invocation lineage：22/22。
- Phase 251 dispatch recovery center：26/26。
- Phase 249 dispatch WAL：39/39。
- Phase 253 post-turn summary delivery capsule：20/20。
- dispatch consume ticket：40/40。
- typed-memory delivery capsule：21/21。

视觉验收：

- 桌面 `1440x1000`：document 和 Memory Center 均无横向溢出；12 张 Task Agent Memory 卡片内部溢出为 0。
- 手机 `390x844`：document `scrollWidth=clientWidth=390`；面板宽 308px，卡片稳定为两列且内部溢出为 0。
- `recovered`、`live edges`、invocation edges、branches 等卡片均正常显示。
- 浏览器 console warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`22540`。
- Memory Center overview：HTTP 200。
- legacy/default 会话：0。
- invocation edge、nonterminal、uncertain、quarantine：0。
- typed-memory dispatch WAL 正式记录：0。
- 发现并直接删除 1 个 2026-07-13 的 Phase 251 旧测试 `.tmp` WAL，会话未迁移。
- `.runtime-server.err.log`：空。

## 后续方向

长期目标继续保持 active。下一阶段继续对照 Claude Code，将 recovery graph 延伸到 provider 原生 resume/fork 的 adoption receipt、跨进程恢复租约与 fencing，以及恢复后首轮上下文重注入证明；仍保持多群聊、多 `gcs_*`、独立 `tas_*` 和 Global Agent 正文隔离边界。
