# Phase 325: Post-compact Dynamic Context Delta

## 目标

对齐 Claude Code 压缩后重新公告动态运行上下文的三类附件：

- `getDeferredToolsDeltaAttachment()`
- `getAgentListingDeltaAttachment()`
- `getMcpInstructionsDeltaAttachment()`

Claude Code full compact 对空历史做 diff，因此重新公告当前完整集合；partial compact 扫描保留消息，只恢复被摘要吃掉的变化。CCM 对应实现必须绑定当前 `group_id + gcs_*`，并适配“每个项目子 Agent 任务创建新第三方会话”的架构。

参考源码：

- `D:\claude-code\src\services\compact\compact.ts`
- `D:\claude-code\src\utils\attachments.ts`
- `D:\claude-code\src\utils\toolSearch.ts`
- `D:\claude-code\src\utils\mcpInstructionsDelta.ts`

## 实现

核心实现位于 `backend/modules/collaboration/group-memory-compaction.ts`：

- `buildGroupPostCompactDynamicContextDeltaProjection()`
- `verifyGroupPostCompactDynamicContextDeltaReceipt()`
- `GROUP_POST_COMPACT_DYNAMIC_CONTEXT_MAX_TOKENS = 20_000`

一个附件同时承载：

1. 当前授权的 MCP 工具和 Skill 名称、描述行。
2. 当前群聊可派发的项目 Agent 列表。
3. 当前已连接且属于授权范围的 MCP server instructions 正文。
4. 三类集合的新增、正文变化和删除项。

删除项会明确要求模型停止调用、派发或继续依赖旧 instructions。删除通知排在大正文之前，超预算时仍优先保留；超大附件使用首尾保留截断。

## Full 与 Partial

full compact：

- 对空公告状态计算差异。
- 重新公告当前完整 tools/Skills、Agent listing 和 MCP instructions。
- 不携带已经移除的历史项。

partial compact：

- 扫描 preserved messages 和仍保留的旧 dynamic delta attachment。
- 未变化项不重复注入。
- 新增项、描述/instructions hash 变化和删除项形成新 delta。
- partial sidecar 会保留上一份 exact-session announcement state，不重置其他会话。

CCM 项目子 Agent 每次执行可能是新的 Claude Code、Cursor 或 Codex 会话，因此子 Agent bundle 不复用另一个子会话的“已公告”状态。每个新子会话都根据当前实时目录生成 full attachment；这是 CCM 多 Agent 架构相对 Claude Code 单主会话的必要适配。

## 真实数据源

`backend/tools/mcp-client.ts` 现在保留 MCP `initialize` 返回的 `instructions`。

`backend/tools/tool-manager.ts` 新增受 `ToolScope` 过滤的动态目录：

- MCP 工具使用当前连接、描述和规范化调用名。
- Skills 使用当前启用目录、描述和 content hash。
- MCP instructions 只来自当前连接且当前授权范围内的 server。
- 空授权得到空工具目录，不会退化为全部工具。

项目 Agent listing 来自当前群聊成员与项目配置，只列出群聊内可派发成员，不包含 coordinator，也不使用其他群聊成员作为 fallback。

## 安全与隔离

附件严格绑定：

- `group_id`
- `group_session_id`，必须为 `gcs_*`
- `scope_id = group_id::group_session_id`

回执为 body-free，只保存：

- added/removed names
- 每项正文 hash
- catalog / announced-state / manifest / body checksum
- scan mode、token 数、截断状态和固定预算

回执不保存工具描述行、Agent 描述或 MCP instructions 正文。正文篡改、回执篡改、跨群和跨会话复用都会被拒绝。附件只恢复模型上下文，不扩大 ToolManager、runtime sync 或 dispatch gate 的实际授权。

## 接入路径

- full compact：`compactGroupConversationMemory()`
- partial compact / sidecar：`buildGroupPartialCompactSidecarSegment()`
- 同步 snapshot：`prepareGroupMemoryResumeProjection()`
- 群聊主 Agent：`buildGroupMemoryContext()` / `buildGroupContextPacket()`
- 新项目子 Agent 会话：`buildAgentMemoryContextBundle()`
- 第三方最终 prompt：`worker-handoff.ts`、`runtime-kernel.ts`、collaboration dispatch / resume
- Memory Center：`Post-compact Dynamic Context Delta` body-free 面板

全局 Agent 没有接入该群聊附件，继续只使用全局上下文。

## 验收

专项脚本：

`scripts/group-post-compact-dynamic-context-delta-restart-selftest.mjs`

结果：34/34 checks 通过，包括：

- full compact 重新公告完整集合
- partial compact 只恢复新增、变化和删除项
- preserved-tail 去重
- 实际 partial sidecar 接线
- removed tool / Agent / MCP instructions 明确撤回
- 20,000-token 首尾保留预算
- 群聊主 Agent、新项目子 Agent和最终 Worker prompt 真实包含附件
- body-free 回执和正文/回执篡改拒绝
- 同群兄弟会话、其他群聊隔离
- 原始 transcript 不变
- 进程重启后附件、checksum 和 Memory Center 继续有效

回归结果：

- Phase 324 current plan attachment：33/33
- Phase 323 invoked Skill attachment：32/32
- compact restart soak：11/11
- compaction hook 双会话隔离：27/27
- `npm run check`：通过
- `npm run build`：通过

## 结论

Phase 325 补齐了 Claude Code compact 后动态工具、Agent listing 和 MCP instructions 的重新公告语义。CCM 现在既能在群聊主会话中按 full/partial 差异恢复，也能为每个新建的第三方项目子 Agent 会话注入当前完整、受授权约束的运行上下文，同时维持多群聊、多 `gcs_*` 和全局 Agent 的隔离边界。
