# 第三方 Agent 记忆 MCP 与受控写回

Date: 2026-07-20

## 目标

让 Codex、Claude Code、Cursor 等第三方项目 Agent通过现有 `ccm__knowledge_context` 读取 CCM 的精确会话连续性和长期记忆，不再在每一轮重复发送完整长 Prompt。同时保持读取与写入严格分离，MCP 不成为第二套正式记忆。

## 最终数据流

```text
CCM transcript / 正式摘要 / 长期记忆
  -> ThirdPartyMemorySnapshotV1 只读派生快照
  -> 签名 ccm__knowledge_context MCP
  -> 第三方 Agent 原生会话

第三方 Agent 输出
  -> 原始输出、任务会话和 MCP usage report
  -> 项目成功回执或群聊主 Agent 验收
  -> 现有 project durable-memory / group typed-memory admission
```

快照文件只保存当前派发所需的不可变分段、checksum 和读取计划。原始 transcript、模型摘要与长期记忆仍是唯一事实来源。

## 会话交付

- 独立项目 Agent 使用 `project_session` 签名绑定，不伪造群聊 task ID。
- 群聊项目子 Agent 使用 `task + groupId + gcs_* + tas_* + project` 精确绑定。
- 新 generation 的未压缩会话使用 `precompact_full_raw`，全部历史按完整轮次分页必读。
- 正式压缩后使用 `canonical_summary_recent_raw`，模型摘要和动态近期原文必读，边界前原文只在核验时读取。
- 同一 Provider、native generation 和 compact boundary 且上一快照已确认时，只交付新增消息和变化记忆。
- 首次返回 native session ID 视为身份补全；已知 native ID 真正变化、Provider 切换、原生 compact generation 或 CCM boundary 变化才强制完整重加载。

## MCP 接口

`ccm__knowledge_context` 从 5 个工具扩展到 10 个：

- 原有知识库工具继续保留。
- `get_context_manifest` 返回快照、必读分段、Token 和记忆清单。
- `read_session_context` 以约 8K、最大 20K token 分页并保持完整对话轮次。
- `search_memory` 复用现有群聊和项目召回入口。
- `read_memory_items` 读取当前 scope 的稳定记忆条目。
- `report_memory_usage` 只写候选使用报告，不直接修改正式记忆。
- `acknowledge_memory_context` 必须在所有 required 分段和记忆读取完成后才签发回执。

模型不能传入 scope ID。项目、群聊、会话和 Agent 身份全部来自 HMAC 签名上下文；兄弟会话读取会因身份不匹配被拒绝。

## Prompt 与容量

MCP 同步成功时，第三方 Prompt 只保留当前任务、权限、验收、snapshot/checksum、challenge 和读取顺序。群聊开发契约使用轻量 MCP reference，不再在 trusted envelope 中二次展开完整记忆。

最终门禁按以下口径计算：

```text
bootstrap Prompt
+ required hydration tokens
+ system / tools / recovery
+ Provider usage baseline
```

因此缩短 Prompt 不会绕过自动压缩。MCP 单页、单批和累计读取也受模型容量约束。

## 受控写回

- 独立项目任务只有 Provider 成功、记忆加载回执有效且 Agent 主动提交有来源/证据的 candidate 时，才进入现有项目记忆 admission。
- 群聊子 Agent usage report 合并到结构化任务回执；只有群聊主 Agent最终验收通过后，现有 accepted-delivery 流程才会提交项目长期记忆或 typed memory。
- failed、partial、驳回、无来源和无证据候选不能成为正式长期记忆。
- MCP usage report 保留 used、ignored、verified、conflicts 和 candidate 状态，但不直接写 canonical memory。

## 失败策略

- MCP 已同步但必读或确认失败：修改任务标记失败，不提交回执与长期记忆；文件变化保留供检查，不自动回退用户工作区。
- 只读问答不强制 MCP，继续使用完整 Prompt。
- Provider 明确不支持 MCP或内部 MCP 未同步时，使用原有完整 Prompt兼容路径。
- 不使用本地摘要、字符截断或放宽阈值绕过失败。

## 验证

- 第三方记忆 MCP：`49/49`，覆盖 Codex、Claude Code、Cursor、无 task 项目会话、全历史必读、确认门禁、增量、压缩重加载、scope 隔离、候选只读与容量门禁。
- 项目会话和原生绑定：`84/84`。
- 全会话 CC 压缩：`51/51`。
- 群聊父会话上下文：`25/25`。
- 群聊主入口与全局上下文：`22/22`。
- 群聊协调业务链端到端通过，覆盖并行任务隔离、worktree 合并、主 Agent 验收、源 Agent 恢复和重启恢复。
- 最终 payload gate、reactive compact、项目长期记忆和内部 MCP catalog 回归通过；内部目录为 `7` 个 MCP、`39` 个工具。
- 测试真实付费 Provider 调用：`0`。

回归过程中同时修正了旧直接任务路径的错误门禁：任务没有群聊记忆上下文时，不再要求提供不存在的群聊 trusted-envelope 注入证明。群聊任务仍保持 fail-closed。

## 主要实现

- `backend/integrations/third-party-memory-snapshot.ts`
- `backend/integrations/knowledge-context-mcp.ts`
- `backend/integrations/internal-mcp-runtime.ts`
- `backend/server.ts` 与 `backend/server-agent-runner.ts`
- `backend/modules/collaboration/collaboration-cross-agents-part-01.ts`
- `scripts/third-party-memory-mcp-hydration-selftest.mjs`
