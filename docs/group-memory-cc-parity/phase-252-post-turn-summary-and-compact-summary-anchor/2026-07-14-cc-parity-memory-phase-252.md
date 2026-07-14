# CCM Memory CC Parity Phase 252

## 目标

对齐 Claude Code 的 compact boundary 与 post-turn summary 生命周期，让每个群聊当前会话拥有可校验的逐轮摘要，并让新建的项目子 Agent `tas_*` 在独立第三方 CLI 会话中真正使用这些摘要。

固定边界：

- 群聊记忆仅允许 `groupId--gcs_*`。
- 同一群聊的不同 `gcs_*` 账本严格隔离。
- 项目子 Agent 接收所属群聊当前会话记忆。
- Global Agent 只接收全局记忆和群聊路由元数据，不接收群聊正文或逐轮摘要。
- `default`、legacy 和废弃旧会话不迁移、不复活，直接删除。
- 压缩仍按实际模型容量、输出预留和自动压缩阈值执行；不会因为原始 transcript 达到 3 MB 就把整份原文直接送给小窗口模型。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts`
- `D:\claude-code\src\services\compact\compact.ts`
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
- `D:\claude-code\src\utils\sessionStorage.ts`

补齐两类协议：

1. compact boundary 显式持久化 `head/anchor/tail`，恢复时使用 synthetic compact summary anchor 重新连接 preserved suffix。
2. 每个 assistant turn 生成与原始 message ID 绑定的 durable post-turn summary，供后续新 `tas_*` 会话恢复最近状态。

## 实现

### Post-turn summary 账本

新增 `backend/modules/collaboration/group-post-turn-summary.ts`：

- 路径：`~/.cc-connect/group-post-turn-summaries/<groupId>--<gcs_*>.jsonl`。
- 只接受 `assistant` 和 `gcs_*`，拒绝 user turn、default 与 legacy scope。
- 每条记录包含 `summarizes_message_id`、`status_category`、`status_detail`、`is_noteworthy`、`title`、`description`、`recent_action`、`needs_action`、`artifact_urls`。
- 使用 sequence、previous checksum、event checksum 的跨文件哈希链。
- 同 message/checksum 幂等；原 message 内容变化时创建 superseding revision。
- 热账本达到 2000 events 后滚动 archive，读取时联合验证 archive 与 hot ledger 的 sequence/checksum 连续性。
- append 使用跨进程 lock、stale lock 回收和 `fsync`。
- bundle 构建时最多回填最近 500 条消息，旧 default 会话不回填。
- 删除群聊会话时同步删除 hot ledger、lock 与 archive。

### 子 Agent 上下文使用

`buildAgentMemoryContextBundle()` 将当前 `groupId--gcs_*` 最近 8 条摘要写入 `group_state.postTurnSummaries`，`renderGroupMemoryContextBundle()` 将最近 6 条压入实际派发文本。

渲染规则：

- 标明摘要绑定原始 assistant message，不能替代当前源码。
- 账本校验失败时 fail closed，不注入可疑摘要。
- `ignore memory` 分支完全不注入。
- 其他群聊和同群其他会话的摘要不会进入当前 bundle。
- Global Agent 路径不读取该账本。

### Compact summary anchor

`ccm-group-preserved-segment-v1` 的 version 升至 2，新边界增加：

- `headMessageId`
- `anchorMessageId`，稳定格式为 `gcsum_<sha256-prefix>`
- `tailMessageId`
- `anchorKind=compact_summary`
- `anchorMode=suffix_preserving`

`group-memory-boundary-journal.ts` 在 commit 和 resume projection 中校验：

- head 等于 first preserved message。
- tail 等于 last preserved message。
- anchor 等于 synthetic summary message ID。
- preserved suffix 与 raw transcript 连续。
- summary checksum、boundary checksum、raw prefix checksum 和 message ID suffix 全部一致。

旧 v1 boundary identity 保持原 checksum 结构，可继续恢复；只有新 v2 boundary 启用 anchor 强校验。锚点异常时恢复 fail closed，并使用完整 raw transcript 重建。

### Memory Center

Session Memory Fleet 新增：

- `turn summaries`
- `missing turns`
- `invalid ledgers`
- `turn archives`

每个会话行展示 assistant turns 覆盖率、缺失数、ledger validity 和 archive 数。后端报告同时暴露 ledger file、head checksum、latest message ID 和 missing message IDs。

## 专项验证

新增 `scripts/group-post-turn-summary-anchor-selftest.mjs`，使用独立临时 home，19/19：

- 多群聊隔离。
- 同一群聊多 `gcs_*` 隔离。
- default/user turn 拒绝。
- assistant turn 记录、幂等、superseding revision。
- backfill 只补 assistant turns。
- checksum 篡改 fail closed。
- 当前子 Agent bundle 注入，其他会话不泄漏。
- ignore memory 不注入。
- Global Agent 不接入。
- Memory Center 统计正确。
- v2 head/anchor/tail 写入与 resume 验证。
- anchor 篡改 fail closed。
- raw transcript 不被修改。
- 删除会话同步删除账本。

回归结果：

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- Phase 252：19/19。
- compact boundary journal：14/14。
- resume integration：7/7。
- Phase 251：26/26，恢复类自测按顺序执行。
- Phase 250：39/39。
- Phase 249：39/39。
- Phase 248：40/40。

视觉验收：

- 桌面 `1440x1000`：26 cards，card overflow 0，row overflow 0，document horizontal overflow 0。
- 手机 `390x844`：26 cards，card overflow 0，row overflow 0，document horizontal overflow 0。
- 浏览器 console error/warning：0。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`27280`。
- 3 个群聊，各自只有 1 个活动 `gcs_*`。
- default/legacy：0。
- 有历史 assistant turn 的当前会话已回填 1/1，ledger valid。
- 其他两个空会话 summary count 为 0，ledger state valid。
- 生产 `ccm-server.err.log`：0 bytes。
- 自测产生的 `phase252-*` 制品已全部删除；修正后的测试确认生产目录残留为 0。

## 后续方向

长期目标仍保持 active。下一阶段继续对照 Claude Code 的 resume/fork/post-turn summary 消费策略，重点评估逐轮摘要的重要性排序、跨 compact epoch 的锚点保留，以及 archive 冷存储恢复证明；不改变 Global Agent 的正文隔离边界。
