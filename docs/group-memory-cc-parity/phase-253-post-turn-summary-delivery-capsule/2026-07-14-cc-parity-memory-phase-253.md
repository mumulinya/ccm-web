# CCM Memory CC Parity Phase 253

## 目标

将 Phase 252 的“逐轮摘要可读取”升级为“每次项目子 Agent 调用实际收到哪一版摘要都可证明”。交付凭证必须同时绑定当前群聊会话、任务、真实 `tas_*`、attempt、spawn/resume、compact epoch 和摘要账本版本。

固定边界保持不变：

- 群聊记忆仅允许 `groupId--gcs_*`。
- 每次项目子 Agent 任务先创建独立 `tas_*`，再接收所属群聊当前会话记忆。
- Global Agent 只使用全局记忆和群聊路由元数据，不接收群聊正文或摘要胶囊。
- `default`、legacy 和废弃旧会话不迁移、不复活。
- `ignore memory` 不生成或注入摘要胶囊。

## Claude Code 对照

本阶段继续对照：

- `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts`
- `D:\claude-code\src\utils\sessionStorage.ts`
- `D:\claude-code\src\utils\agentContext.ts`

Claude Code 的 post-turn summary 不只保存摘要内容，还通过 `session_id`、`summarizes_uuid`、parent/invocation edge 和 compact anchor 连接 spawn/resume 生命周期。CCM 现在用 delivery capsule 将同类边界落到第三方子 Agent 的真实调用点。

## 实现

### Delivery Capsule

`backend/modules/collaboration/group-post-turn-summary.ts` 新增：

- schema：`ccm-group-post-turn-summary-delivery-capsule-v1`。
- 身份：`group_id`、`group_session_id`、`task_id`、`target_project`、`task_agent_session_id`、`native_session_id`、`execution_id`。
- 调用边界：`attempt_sequence`、`invocation_kind=spawn|resume`、`compact_epoch`。
- 账本边界：`ledger_head_checksum`、`ledger_last_sequence`。
- 摘要绑定：summary ID、assistant message ID、message checksum、event checksum、sequence。
- 完整胶囊使用 canonical SHA-256 `capsule_checksum`。

选择策略最多交付 6 条：始终保留最新 3 条，其余位置优先保留 noteworthy、failed、blocked、waiting 和 review-ready 摘要，最后再按新近程度补齐。最终顺序仍按原始 sequence 排列，因此不会因重要性排序丢掉当前最后状态。

验证器拒绝：

- schema/checksum 异常。
- 非 `gcs_*` 或非 `tas_*` 身份。
- task、project、native session、execution、attempt、spawn/resume 不一致。
- 跨群聊、跨群聊会话、跨 task Agent session 复用。
- compact epoch 变化。
- ledger head 变化。
- assistant message revision 后旧 summary/message/event checksum 失效。
- rendered prompt 未包含 capsule checksum。

完整胶囊与 Memory Center 紧凑投影使用不同 schema。专项测试曾发现递归提取器会优先取到紧凑投影；现提取器只接受同时携带 `capsule_checksum` 和 `selected_summaries` 的完整胶囊。

### Bundle 与派发准入

`buildAgentMemoryContextBundle()` 在真实 `tas_*` 存在且当前账本有效、有摘要时生成胶囊，并同时写入 snake_case/camelCase 顶层字段。摘要正文只投递胶囊选择集。

渲染文本明确输出：

- capsule checksum。
- `task_agent_session_id`。
- attempt 与 spawn/resume。
- compact epoch。
- ledger head checksum。
- 最终 `CCM_AGENT_RECEIPT` 必须引用 capsule checksum。

`admitChildPostTurnSummaryDelivery()` 在实际派发前重新读取当前群聊会话、当前 compact epoch 和当前摘要账本。任何变化都 fail closed，调用方必须重建 bundle；没有 typed MEMORY.md 但已经注入逐轮摘要时，摘要准入仍独立生效。

`admitChildTypedMemoryDelivery()` 先执行摘要准入，再执行既有 typed-memory capsule/lease/ticket 准入，并在成功结果中同时返回两类胶囊。

### WorkerContextPacket 与 Snapshot

`buildWorkerContextPacket()` 将完整摘要胶囊提升为顶层 `post_turn_summary_delivery_capsule`，并把 checksum 纳入 packet identity 和 acceptance contract。

`bindTaskAgentMemoryContextSnapshot()` 固化：

- 完整胶囊与 checksum。
- selected count 与 ledger head。
- rendered prompt 是否包含 checksum。
- task Agent session、attempt 和 invocation kind 绑定结果。

snapshot inventory 额外校验：

- 胶囊 checksum 与会话身份。
- snapshot 内 compact epoch 一致性。
- snapshot 内 ledger head 一致性。
- 胶囊选择集是否完整存在于快照摘要投影。
- prompt checksum 绑定。

胶囊或 snapshot 被篡改时均为 hard gap。历史 snapshot 不会仅因账本后来正常追加而被误判为篡改；当前 ledger freshness 只在真实派发准入点强制执行。

### Memory Center

Task Agent Memory Snapshots 新增：

- summary capsule count / valid count。
- missing / invalid count。
- prompt-bound count。
- task session-bound count。
- compact epoch mismatch count。
- ledger head mismatch count。
- summary selection mismatch count。

群聊压缩边界页新增 `summary capsules` 和 `capsule gaps` 卡片，并展示 prompt 绑定与 epoch drift。

## 专项验证

新增 `scripts/group-post-turn-summary-delivery-capsule-selftest.mjs`，使用隔离的临时 `HOME/USERPROFILE`，20/20：

- capsule checksum。
- noteworthy + latest 选择策略。
- spawn attempt 1 与 resume attempt 2。
- WorkerContextPacket 顶层提升。
- prompt checksum 绑定。
- compact epoch 和 ledger head 变化拒绝。
- assistant message revision 后旧胶囊拒绝。
- 跨 group、`gcs_*`、`tas_*` 拒绝。
- ignore-memory 与 Global Agent 无胶囊。
- snapshot 持久化与篡改 fail closed。
- raw transcript 不修改。

回归结果：

- `npm run check`：通过。
- `npm run build`：通过。
- Phase 253：20/20。
- Phase 252：19/19。
- typed-memory delivery capsule：21/21。
- typed-memory dispatch consume ticket：40/40。
- group session memory delivery evidence：14/14。

视觉验收：

- 桌面 `1440x1000`：document horizontal overflow 0；4 张新卡单行排列。
- 手机 `390x844`：document horizontal overflow 0；4 张新卡按 2x2 排列；text overflow 0。
- 浏览器 console warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`17984`。
- Memory Center overview：HTTP 200。
- default/legacy group session：0。
- 当前可见逐轮摘要：1；missing turns：0；invalid ledger：0。
- 当前生产 task snapshot 尚无摘要胶囊历史样本：capsules 0、missing 0、invalid 0；新派发会开始生成。
- `.runtime-server.err.log`：0 bytes。
- `phase252/phase253/post-turn-delivery` 自测制品在真实记忆目录残留：0。

## 后续方向

长期目标继续保持 active。下一阶段优先对照 Claude Code 的 parent/child invocation edge 和 fork/resume lineage，把胶囊从单次派发证明扩展为跨多次 provider retry、fork 和恢复分支的不可混淆调用图，同时保持 Global Agent 正文隔离边界。
