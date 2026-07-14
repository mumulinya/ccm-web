# CCM Memory CC Parity Phase 256

## 目标

将 Phase 255 的 durable invocation crash recovery 补成可跨进程排他恢复、可证明 provider 原生会话接管、并能证明恢复后首轮重新注入群聊记忆的完整闭环。

固定边界保持不变：

- 群聊记忆只使用 `groupId--gcs_*`，多群聊和同一群聊的多会话相互隔离。
- 每个项目子 Agent 任务使用独立 `tas_*`，并注入所属群聊当前 `gcs_*` 的记忆。
- Global Agent 只接收全局记忆和路由元数据，不接收群聊正文。
- `ignore memory` 不注入历史记忆，也不伪造 reinjection proof。
- `default`、legacy、废弃旧会话和旧测试会话直接删除，不迁移、不复活。

## Claude Code 对照

本阶段对照 Claude Code 在 resume、fork、provider/session continuation 和 compact 后上下文恢复中的连续性语义。第三方 Agent 的原生 session id 不能单独作为可信事实，因此 CCM 使用四层证据：

1. invocation edge 固定 `groupId--gcs_*--tas_*`、parent、branch 和 prompt/snapshot 身份。
2. recovery lease 保证同一群聊会话同一时间只有一个恢复 owner 可以修改 edge。
3. adoption receipt 证明新 provider/native session 确实接管了指定 parent 和 runner request。
4. reinjection proof 证明恢复后的首轮真实派发重新携带了当前群聊会话记忆，而不是只恢复第三方会话句柄。

## 实现

### Recovery Lease 与 Fencing

`backend/tasks/task-agent-invocation-lineage.ts` 新增 `ccm-task-agent-invocation-recovery-lease-v1`：

- lease 按 `groupId--gcs_*` 隔离并跨进程持久化。
- 存活 owner 持有有效 lease 时，其他进程不能修改 recovery edge。
- 本机 owner PID 死亡时可立即接管，不等待旧租约自然过期。
- 每次认领和接管都分配单调递增 fencing token。
- recovery mutation 持久化 lease id 和 fence；旧 fence 不能覆盖新 owner 的结果。
- reconcile 完成后 lease 进入 `completed`，而不是遗留为 active。
- 删除群聊会话时同步删除对应 recovery lease。

### Adoption Receipt

新增 `ccm-task-agent-invocation-adoption-receipt-v1`，绑定：

- invocation edge、parent edge 和 branch。
- provider/native session id。
- runner request、memory snapshot、WorkerContextPacket 和最终 prompt。
- adoption 状态与 checksum。

resume、provider switch 和 fork 都必须生成 receipt。原生 resume 返回与预期不同的 session id 时保持 `unverified`，不能把新会话误认为旧会话已连续接管。

### Reinjection Proof

新增 `ccm-task-agent-invocation-reinjection-proof-v1`：

- 正常派发由真实 memory delivery receipt 证明首轮重注入。
- 崩溃恢复可从校验通过的 direct runner request/result pair 重建证明。
- proof 绑定当前 `groupId--gcs_*`、`tas_*`、snapshot、WCP、prompt 和 invocation edge。
- 送达回执、scope、checksum 或 prompt 任一被篡改时保持 `unverified`。
- `ignore memory` 和 Global Agent 路径不会生成虚假 proof。

群聊协作、direct task 和 auto assign 三条真实派发路径都调用 `bindTaskAgentInvocationMemoryDelivery()`，因此证明来自实际派发，不是 Memory Center 的推测统计。

### Memory Center

Task Agent Memory 报告新增：

- adoption required、receipt、verified、invalid。
- reinjection required、proof、proven、unverified。
- active recovery lease、takeover 和 recovery fence。

前端卡片新增 `adoption`、`re-injected`、`recovery fence`，Invocation Recovery 明细同时显示 receipt/proof/fence 状态。

### Windows 持久化收尾

生产验收发现 `conflict-resolution-maintenance-scheduler.json` 在 Windows 上偶发 `renameSync(temp, existingTarget)` 的 `EPERM`。新增 `backend/core/atomic-json-file.ts` 并接入 scheduler state：

- `wx` 独占锁、token/PID/hostname 所有权校验和死 PID 接管。
- lock 释放同样执行 Windows 重试；极端释放失败会写入 `released_at`，下一次认领可安全回收，不会被仍存活的旧 PID 永久阻塞。
- 锁内完成读取、维护和写回，避免两个进程读取旧状态后互相覆盖。
- 随机临时文件、文件 `fsync`、Windows `EPERM/EACCES/EBUSY/EEXIST` 重试。
- 替换失败时先保留旧目标，再移动完整临时文件，并在失败时恢复旧目标。
- 只有旧主文件是合法 JSON 时才更新 `.bak`，损坏主文件不会污染健康备份。
- 读取主文件失败时可回退最近有效 `.bak`。

## 验证

新增：

- `scripts/task-agent-invocation-adoption-selftest.mjs`。
- `scripts/atomic-json-file-concurrency-selftest.mjs`。

Phase 256 专项测试为 42/42：

- first fence：1。
- dead-owner takeover fence：4。
- reconcile fence：2。
- adoption verified：2。
- reinjection proven：2。
- crash recovered：1。

原子 JSON 专项测试：

- 24 个独立 Node 进程并发更新同一状态文件，再执行死 owner 和 released owner 接管，26 条最终记录全部保留。
- 死 PID owner 可立即接管。
- 已明确释放但 former owner PID 仍存活的锁可安全接管。
- 损坏主文件可从有效 `.bak` 恢复，损坏内容不会覆盖备份。
- `.lock`、`.tmp`、`.replace-backup` 遗留为 0。

顺序回归结果：

- `npm run check`：通过。
- `npm run build`：通过。
- Phase 256 invocation adoption：42/42。
- Phase 255 invocation recovery：32/32。
- Phase 254 invocation lineage：22/22。
- dispatch recovery center：26/26。
- direct dispatch spool：39/39。
- typed-memory dispatch WAL：39/39。
- dispatch consume ticket：40/40。
- typed-memory delivery capsule：21/21。
- conflict resolution scheduler integration：12/12。

视觉验收沿用本阶段完成的真实 Memory Center 检查：

- 桌面 `1440x1000`：15 张 Task Agent 卡片无内部或页面横向溢出。
- 手机 `390x844`：面板宽 308px，两列卡片稳定，无溢出。
- 浏览器 console warning/error：0。

## 会话清理

- 3 个真实群聊各自恰好保留 1 个当前 `gcs_*`。
- legacy/default 会话：0。
- archived/历史群聊会话：0。
- 删除 40 个明确以 Phase 228/234/235 或 resume integration 命名的旧自测空目录，不迁移其中任何数据。
- `group-messages/sessions` 和 `group-memory-sessions` 现在都只有 3 个真实群聊目录，测试目录为 0。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`17908`。
- Memory Center overview：HTTP 200。
- Memory Center quality：HTTP 200。
- scheduler state 已在新进程周期内成功更新，锁遗留为 0。
- `.runtime-server.err.log`：0 字节，原有 Windows `EPERM` 未复现。
- invocation lineage 正式文件：0。
- invocation recovery 正式文件：0。
- typed-memory dispatch WAL 正式文件：0。
- adoption/reinjection/recovery lease 当前生产计数均为 0，符合没有正式 invocation edge 的状态。

## 后续方向

长期目标继续保持 active。下一阶段继续对照 Claude Code，重点审计第三方 provider 的真实 native resume/fork 返回语义、跨模型上下文窗口变化后的重新预算，以及 adoption/reinjection 证明在真实长任务和服务重启 soak 中的持续稳定性；现有多群聊、多 `gcs_*`、独立 `tas_*` 和 Global Agent 正文隔离边界不变。
