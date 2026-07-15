# Phase 324: Post-compact Current Plan and Plan Mode Attachment

## 目标

对齐 Claude Code `src/services/compact/compact.ts` 的以下压缩后恢复能力：

- `createPlanAttachmentIfNeeded()`：压缩后恢复当前 Agent/session 的计划正文。
- `createPlanModeAttachmentIfNeeded()`：仍处于 plan mode 时恢复完整模式提醒。
- full compact 与 partial compact 使用同一恢复语义。

CCM 对应目标是：只从当前 `group_id + gcs_*` 精确群聊会话选择当前任务计划，并把计划正文和确认状态恢复给群聊主 Agent、项目子 Agent及第三方 Worker。全局 Agent 不接收该群聊计划附件。

## 实现

核心实现位于 `backend/modules/collaboration/group-memory-compaction.ts`：

- `buildGroupPostCompactPlanAttachmentProjection()`
- `verifyGroupPostCompactPlanAttachmentReceipt()`
- `GROUP_POST_COMPACT_PLAN_MAX_TOKENS = 50_000`

计划来源按现有任务真实结构读取：

1. `workflow_meta.plan_mode`
2. `workflow_meta.intake.plan_mode`
3. `intake_draft`
4. `plan_mode` / `planMode`
5. 通用结构化 `plan`

选择规则：

1. 显式 `currentTaskId` 优先。
2. 否则选择当前会话最近消息关联的非终态任务。
3. 再否则选择同一精确会话最近的活跃计划；等待确认计划优先。
4. 不使用同群兄弟 `gcs_*`、其他群聊或 group-level fallback。
5. 无活跃计划时不恢复已完成旧计划。

## 容量语义

Claude Code 的 `POST_COMPACT_TOKEN_BUDGET` 为 `50_000` tokens。CCM 使用同一数值作为单个异常超长计划附件的上限，而不是按群聊累计记忆体积随意蒸馏计划。

- 正常计划完整恢复。
- 只有计划正文自身超过 50,000 tokens 时才保留首尾并标记 `truncated=true`。
- 计划附件仍计入 CCM true post-compact payload gate，不能绕过模型上下文容量。

## Plan Mode

以下状态恢复为等待确认模式：

- `intake_state === awaiting_confirmation`
- `requires_confirmation === true`
- 明确任务模式为 `plan` / `plan_mode` / `planning`
- 计划控制状态为等待确认或退回修订

以下状态明确不恢复为等待确认：

- `intake_state === confirmed`
- `confirmation_status === confirmed`
- 已存在 `confirmed_at` / `accepted_at` 且计划不再要求确认

等待确认提醒会明确限制：用户确认前只能继续只读探索或修订计划，不得派发执行、修改文件或运行写入/破坏性动作。已确认计划仍恢复正文，但作为执行与验收依据，不会错误回退到等待确认。

## 接入路径

- full compact：`compactGroupConversationMemory()`
- partial sidecar：`buildGroupPartialCompactSidecarSegment()`
- 同步 snapshot：`prepareGroupMemoryResumeProjection()`
- 群聊主 Agent：`buildGroupMemoryContext()` / `buildGroupContextPacket()`
- 项目子 Agent：`buildAgentMemoryContextBundle()` / `renderGroupMemoryContextBundle()`
- 最终第三方 Worker：`worker-handoff.ts`、`runtime-kernel.ts` 和 collaboration dispatch/resume 路径
- Memory Center：`Post-compact Current Plan Attachment` body-free 面板

附件回执不保存计划正文，只保存 scope、task id、确认状态、plan hash、body checksum、token 数、截断状态和 checksum。正文篡改、回执篡改、跨群或跨会话复用都会被校验拒绝。

## 验收

专项脚本：

`scripts/group-post-compact-plan-attachment-restart-selftest.mjs`

结果：33/33 checks 通过，包括：

- 当前任务优先和最近活跃计划 fallback
- awaiting confirmation 与 confirmed 状态不混淆
- Claude Code 50,000-token 计划预算
- full / partial / sync 一致
- 群聊主 Agent、项目子 Agent和最终 Worker 提示词真实包含计划正文
- 同群兄弟会话和其他群聊不泄漏
- body-free 回执、正文/回执篡改拒绝
- 原始 transcript 与 `tasks.json` 不变
- 进程重启后附件、checksum、Memory Center 继续有效

回归结果：

- Phase 323 invoked Skill attachment：32/32
- Phase 322 file restore dedup：25/25
- Phase 321 child task status：28/28
- compact restart soak：11/11
- compaction hook 双会话隔离：27/27
- `npm run check`：通过
- `npm run build`：通过

## 结论

Phase 324 补齐了 Claude Code 压缩后附件中最关键的剩余差异：当前计划正文和 plan mode 连续性。CCM 现在可在多群聊、多会话和每任务新建第三方 Agent 会话的架构下，稳定恢复当前精确会话的计划边界，同时保持全局 Agent 的全局上下文隔离。
