# CCM Memory CC Parity Phase 242

## 阶段目标

把子 Agent 在当前源码中发现的记忆冲突，转换为严格绑定当前群聊会话的待确认更新或删除候选。第三方 Agent 只能报告冲突，不能自行改写、删除或扩大长期记忆；只有用户在 Memory Center 明确确认后，变更才进入后续子 Agent 上下文。

本阶段继续遵守长期边界：

- 类型化记忆作用域必须是 `groupId--gcs_*`。
- 每个群聊会话有独立候选账本和召回投影，Session A 不影响 Session B。
- 第三方项目子 Agent 每次任务仍创建独立任务会话。
- Global Agent 只接收全局记忆和群聊路由元数据，不接收群聊会话记忆或候选正文。
- legacy `default`、旧迁移会话和已明确废弃的历史会话直接删除，不做记忆迁移。

## Claude Code 对照

Claude Code 在 `D:\claude-code\src\memdir\memoryTypes.ts` 的 `MEMORY_DRIFT_CAVEAT` 中明确要求：

- 记忆是某个时间点的上下文，不是当前仓库事实。
- 回答或建立假设前，应读取当前文件或资源重新核验。
- 当前信息和记忆冲突时，相信当前观察。
- 错误或过期记忆应被更新或删除，不能继续据此行动。

`D:\claude-code\src\memdir\teamMemPrompts.ts` 的保存协议进一步要求：

- 更新或删除后来被证明错误、过期的记忆。
- 写入前先检查是否已有可更新记忆，避免重复。
- MEMORY.md 只保存索引，具体记忆保持独立文件。

CC 可以在自己的受控记忆目录里直接维护文件。CCM 的记忆会被群聊主 Agent 和多个外部项目 Agent 共同消费，因此 Phase 242 增加了更严格的人机确认层：Worker 提议，平台验证，用户决定，投影执行。

## 实现内容

### 1. 子 Agent 冲突回执

`CCM_AGENT_RECEIPT.typedMemoryUsage` 新增可选冲突字段：

```json
{
  "conflictDetected": true,
  "conflictKind": "removed | renamed | behavior_changed | resource_changed",
  "recommendedMemoryAction": "update | remove",
  "conflictReason": "当前源码与记忆冲突的具体原因",
  "replacementMemory": "update 时的候选新规则"
}
```

Worker trust contract 明确说明：当前源码优先，子 Agent 不得直接修改长期记忆。`update` 必须给出 replacement，`remove` 不保存 replacement。

### 2. 严格候选准入

新增 `.typed-memory-stale-candidate-ledger.json`。只有同时满足以下条件才生成 pending candidate：

- exact `groupId--gcs_*` 作用域。
- relPath 和当前 MEMORY.md document checksum 完全匹配。
- task Agent session、memory context snapshot、delivery receipt 全部绑定且已由平台验证。
- current-source 文件位于目标项目目录内。
- 平台重新读取当前文件并复算完整 SHA-256，结果与 Worker 声明一致。
- 冲突原因非空，action 只能是 update/remove。
- update replacement 非空。
- usageState 不是 ignored；ignore-memory 不能创建候选。

未通过准入的输入只记录 rejection id、作用域、任务/session 标识、relPath、请求 action 和拒绝码，不保存 conflict reason 或 replacement 正文。错误的裸群聊/default scope 不创建旧式 sidecar 文件。

### 3. 防篡改和幂等账本

候选、resolution event 和 invalid rejection 都有独立 SHA-256；账本还有覆盖条目 checksum 序列的 envelope checksum。

- 相同 Worker 结果说明重放只命中同一个 deterministic candidate id。
- invalid rejection 同样按稳定 id 去重。
- candidate checksum、resolution event checksum 或 ledger envelope 任一异常，整体 integrity 失败。
- candidate、resolution event 和 invalid rejection 的 `scope_id` 必须与读取作用域完全一致，event 的 `candidate_checksum` 必须回指原候选。
- 将 Session A 的完整有效账本复制到 Session B 时，因 scope binding 不匹配而整体失效，不能形成跨会话 tombstone 或 replacement。
- integrity 失败时类型化记忆扫描返回空集合，避免旧 tombstone 因账本损坏而重新浮现。
- 确认 API 必须提交原 candidate checksum、明确 action、原因和 `explicit_confirmation=true`。

### 4. 用户确认执行

Memory Center 新增“陈旧记忆更新候选”面板和：

- `GET /api/memory-center/stale-candidates?scope_id=groupId::gcs_*`
- `POST /api/memory-center/stale-candidates`
- `confirm_update`
- `confirm_remove`
- `reject`

确认时平台再次验证：

- exact group/session scope。
- candidate checksum。
- candidate 仍为 pending。
- 原 MEMORY.md relPath/checksum 未变化。
- 当前源码文件仍存在且 SHA-256 与候选生成时一致。
- 用户操作与 Worker 推荐 action 一致。

源码在候选生成后再次变化时，旧证明不能执行，必须生成新候选或由用户拒绝。

### 5. 持久 tombstone 投影

用户确认后不直接依赖删除生成型 Markdown：

- remove 追加 applied resolution event，并按 relPath 持久隐藏旧记忆。
- update 同样隐藏旧 relPath，另建 `stale-replacement-<candidateId>.md`。
- `scanGroupTypedMemoryDocuments` 和 `buildGroupTypedMemoryIndex` 始终应用 resolution 投影。
- 即使后续 distillation 再次生成相同旧 relPath，旧版本也不会重新进入 MEMORY.md 或子 Agent recall。
- reject 只追加 immutable rejected event，不改变当前记忆。

被用户拒绝的候选在 Memory Center 只显示状态、原因和审计元数据，不显示 replacement 正文。

## 会话与 Global 边界

Phase 242 自测覆盖两个独立群聊会话：

- Session A 的 update/remove tombstone 不进入 Session B。
- Session B 的同名 MEMORY.md 保持可召回。
- 候选 API 只接受 `groupId::gcs_*`，内部映射到 `groupId--gcs_*`。
- 裸群级/default scope fail closed，且不创建旧式候选目录。
- Global Agent 的 `memory_context_boundary.group_session_context_included=false` 保持不变。
- Global Agent 上下文不包含 conflict reason、replacement 或 MEMORY.md 正文。

生产 manifest 核查结果：三个真实群聊均只有一个活动 `gcs_*`，archived/default/legacy 数量为 0，因此本阶段没有需要迁移或保留的旧会话。现有 delete/purge/prune 路由删除消息文件后会同步调用 `deleteGroupSessionMemoryArtifacts`，后续旧会话继续采用直接删除策略。

按用户确认的“不迁移旧会话、直接删除”策略，本阶段验收时又清除了 `group-memory-sessions` 下 32 个早期自测/恢复演练目录；目录白名单来自 `groups.json`，最终只保留三个真实群聊目录。

## 验证结果

- `npm run check`：通过。
- 后端 TypeScript 构建：通过。
- 前端 Vite 构建：通过。
- Phase 242 stale candidate lifecycle：36/36。
- 当前源证明回归：20/20。
- Phase 241 recall freshness/trust contract：14/14。
- typed-memory consumption feedback：18/18。
- semantic reference recall：20/20。
- candidate update/remove/reject：通过。
- 确认前不影响 recall：通过。
- update replacement 可召回：通过。
- remove 后旧正文消失：通过。
- distillation 同 relPath 再生成仍受 tombstone 抑制：通过。
- Session A/B 隔离：通过。
- Global Agent 候选正文隔离：通过。
- ignore-memory 不生成候选：通过。
- invalid candidate rejection 不保存正文：通过。
- candidate/ledger 篡改 fail closed：通过。
- 当前源码在确认前变化时拒绝执行：通过。
- 生产完整质量评估：160 项，73.8/warn，11 ok、145 empty、4 个既有失败，无新增失败，耗时 30.964 秒。
- 桌面端真实 Memory Center：候选面板可见，4 张状态卡无溢出和重叠。
- 390px 移动端：候选面板宽度 292px，无横向溢出、卡片溢出或重叠。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`29072`
- HTTP `/api/groups`：200。
- Phase 242 final server error log：0 字节。
- 三个活动群聊会话的 stale-candidate GET 均返回 checksum valid、pending 0、candidate 0。
- 裸群级 stale-candidate GET 返回 HTTP 400。
- `gmps7ha15::gcs_mriu5m33_ahy0yo`：sessions 1、archived 0、legacy/default 0。
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`：sessions 1、archived 0、legacy/default 0。
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`：sessions 1、archived 0、legacy/default 0。
- 生产 stale-candidate sidecar 0；没有冲突候选时不创建空候选文件。
- Phase 242 自测运行时残留 0。

## 长期目标状态

Phase 242 已完成，但“CCM 记忆系统持续对齐 Claude Code”长期目标继续保持 active。

后续优先方向：继续对照 CC 的多来源 memory 写入和团队记忆同步语义，增强用户确认后的重复候选合并、跨时间 current-source re-proof 调度和候选老化治理，同时保持群聊会话硬隔离、Global Agent 群聊正文隔离、外部 Worker 无直接记忆写权限。
