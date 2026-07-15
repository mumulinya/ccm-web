# CCM Memory CC Parity Phase 327

## 目标

对齐 Claude Code `buildPostCompactMessages()` 的固定消息顺序，并确认现有 compact boundary 的 preserved segment relink 已经完整覆盖，不重复实现已有能力。

固定顺序：

1. `compact_boundary`
2. `summary`
3. `preserved_messages`
4. `attachments`
5. `post_compact_hooks`

继续保持以下边界：

- 每个群聊只使用所属 `groupId + gcs_*` 会话记忆。
- 项目子 Agent 的每个新 `tas_*` / 第三方 CLI 会话重新接收并验证当前群聊会话上下文。
- Global Agent 不读取群聊正文、压缩摘要或 preserved window。
- 原始群聊消息 JSON 和 `tasks.json` 不因压缩或重排被修改。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\compact\compact.ts`
- `buildPostCompactMessages()`
- `annotateBoundaryWithPreservedSegment()`

审计确认 Phase 252 已经实现并验证：

- `headMessageId`
- `anchorMessageId`
- `tailMessageId`
- `anchorKind=compact_summary`
- `anchorMode=suffix_preserving`
- boundary journal commit、resume projection、checksum 和 fail-closed rebuild

因此本阶段只补已证实的顺序差距。此前子 Agent 记忆包会在压缩摘要和恢复原文窗口之前输出 invoked Skill、current plan 和 dynamic context 附件，与 Claude Code 的固定顺序不同。

## 实现

### 持久顺序凭证

`group-memory-compaction.ts` 新增：

- `ccm-group-post-compact-message-order-receipt-v1`
- `buildGroupPostCompactMessageOrderReceipt()`
- `verifyGroupPostCompactMessageOrderReceipt()`

凭证绑定：

- `group_id`
- 精确 `group_session_id=gcs_*`
- `boundary_id` 和 `compact_epoch`
- `summary_checksum`
- preserved segment 的 `head/anchor/tail` 与 checksum
- invoked Skill、current plan、dynamic context 的附件 receipt checksum
- post-compact hook run、结果数量和结果 checksum
- 固定五段顺序和总 `receipt_checksum`

凭证写入：

- `compactBoundary.postCompactMessageOrderReceipt`
- `compactBoundary.post_compact_restore.messageOrderReceipt`
- `compaction.postCompactMessageOrderReceipt`
- `messageCompression.postCompactMessageOrderReceipt`

完整压缩、`partial up_to` 和自动 reactive 压缩共用同一生成路径。

### 子 Agent 上下文顺序

`renderGroupMemoryContextBundle()` 现在按以下相对顺序渲染：

1. compact boundary 与恢复校验元数据
2. 群聊压缩摘要
3. 已验证的 preserved recent window 和相关原文证据
4. invoked Skill、current plan、dynamic context 附件
5. post-compact Hook Ledger 结果

当前任务和回执约束仍作为本轮控制信息保留，不计入历史 post-compact message segment。

新凭证存在时必须通过 checksum、群聊、精确会话、boundary、summary 和 order 校验；校验失败时 fail closed，不向第三方子 Agent 注入附件和 hook 结果。旧会话没有该凭证时保持兼容，下一次有效压缩会生成新凭证。

群聊主 Agent 的 compact summary 与附件也调整为摘要在前、附件在后。

## 专项验证

新增：

- `scripts/group-post-compact-message-order-restart-selftest.mjs`
- `npm run test:group-post-compact-message-order-restart`

结果：`28/28`。

覆盖：

- 固定五段顺序。
- preserved `head/anchor/tail` 进入凭证。
- receipt checksum 校验。
- 同群聊其他 `gcs_*` 拒绝复用。
- 顺序篡改 fail closed。
- 篡改后 Skill、plan、dynamic context 和 hook 均不注入。
- 完整压缩持久化凭证。
- `partial up_to` 持久化凭证。
- 自动 reactive 压缩持久化凭证。
- 新进程重启后凭证和渲染顺序保持一致。

回归：

- Phase 326 loaded tool state：`36/36`。
- Phase 325 dynamic context delta：`34/34`。
- compact boundary journal：`16/16`。
- compact restart soak：`11/11`。
- `npm run check`：通过。

## 当前判断

CCM 记忆系统的可用主体已经完成。本阶段属于最后约 5% 的 Claude Code 源码协议收口，不是重新建设压缩、会话隔离或子 Agent 上下文注入。长期目标继续保持 active，用于跟随 Claude Code 后续源码变化和真实运行反馈。
