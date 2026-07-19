# Phase 397: Project Session Native Agent Binding And Model Compaction

## 目标

让项目管理中的逻辑会话 `s1/s2` 稳定绑定第三方 Agent 执行会话，而不是每发送一条普通消息都创建互不相关的 `tas_*` 和 native session。

同时让项目会话按 Memory Center 的 token 触发线自动进行模型摘要，也可使用 `/compact [摘要要求]` 手动压缩。压缩成功后关闭旧 native session 世代，并把摘要与最近消息注入下一世代。

## 身份模型

稳定作用域由以下身份确定：

```text
project + project_session_id
```

作用域使用 SHA-256 派生为 `project-session:<28 hex>`，不把项目名或会话 ID 直接拼入文件路径。

同一逻辑会话内部：

```text
s1
├─ pchat_1 ┐
├─ pchat_2 ├─ tas_1 ─ provider native session A
└─ pchat_3 ┘
```

- `s1`：用户看到的 CCM 项目会话。
- `pchat_*`：每轮执行记录、Trace、检查点和文件变更。
- `tas_*`：当前项目会话世代的 CCM TaskAgentSession。
- native session：Claude Code、Codex、Cursor 等 Provider 返回的原生会话。

## 请求链

- 项目前端的 JSON 与 multipart 请求都发送精确 `session_id`。
- `/api/send-stream` 验证项目会话存在。
- `createProjectChatRun` 持久化 `project_session_id` 与 `project_session_generation`。
- `bindProjectRunAgentSession` 对带项目会话身份的请求使用稳定绑定；旧的无 session 调用仍保留 legacy 行为。
- 第一轮捕获 native session ID 后，普通下一轮直接得到 `resumeSession=true` 和同一个 native session ID。

## 世代与生命周期

- 同一 Provider：复用当前 open `tas_*`。
- Provider 切换：关闭旧 Provider 的 open 世代，新 Provider 创建下一代 `tas_*`。
- 清空项目会话：清空消息并关闭当前世代，下一条消息创建新世代。
- 删除项目会话：删除聊天记录、稳定绑定、相关 `tas_*` 和所属 `pchat_*`。
- 归档项目：保留会话和执行记录，但关闭所有当前第三方 Agent 世代。
- 永久删除归档项目：清理项目会话绑定和所属执行记录。
- 删除单个 `pchat_*`：只清理该轮执行产物，不删除共享的项目会话 `tas_*`。

## 并发与续跑隔离

- 同一稳定项目会话在后端同一时间只允许一个 Agent 执行。
- 不同 `s1/s2` 可以并行。
- 显式继续/重试的 `parent_run_id` 必须属于同一项目和同一项目会话。
- 队列消息使用入队时记录的 project/session 身份，切换页面后不会串入另一会话。
- Agent 执行占用锁与模型压缩共享；第三方 Agent 工作期间拒绝手动压缩。

## 模型压缩

- `/compact` 现在支持 `global`、`project`、`group` 三个入口。
- 自动压缩使用 `modelAutoCompactTokenLimit`，不按固定消息数量随意压缩。
- 保留最近 24 条消息，旧消息由配置的统一模型生成结构化 JSON 摘要。
- 模型最多尝试 3 次；输出必须匹配精确 `sourceMessageIds`。
- 授权边界和文件路径必须逐字保留。
- 上一轮摘要 checksum 不匹配时拒绝继续压缩或注入。
- 模型缺失、失败或输出不合法时，不提交摘要、不关闭当前 native session。
- 原始项目会话历史仍完整保存在会话文件中，摘要是 Provider 上下文投影，不删除原始记录。
- 压缩提交成功后关闭当前 `tas_*`，下一条消息创建下一 generation。
- 新 generation 首轮注入模型摘要与最近消息；Provider 切换时也执行相同的连续性回灌。

## 可观察性

项目会话详情返回动态 `agent_binding`：

- `generation`
- `task_agent_session_id`
- `native_session_id`
- `provider`
- `resume_mode`
- `turn_count`
- `status`

`publicProjectChatRun` 同时返回 `project_session_id` 和 `project_session_generation`。

## 验证

- `npm run test:project-session-native-binding-restart`: `54/54`。
- 同会话 `tas_*` 复用通过。
- native ID 捕获后的普通下一轮恢复通过。
- 进程重启恢复通过。
- 兄弟 `s2` 隔离通过。
- Provider 切换 generation 通过。
- 清空切代与删除清理通过。
- 单个 `pchat_*` 删除不误删共享绑定。
- 模型压缩后 generation 轮换通过。
- 无效摘要 fail closed 通过。
- 压缩摘要和最近消息回灌通过。
- 摘要 checksum 篡改拒绝注入通过。
- 执行中压缩互斥通过。
- 真实 Provider 调用：`0`。
- Backend TypeScript build 通过。
- Frontend Vite build 通过，2059 modules。
- `check-factory-deps.js` 全部通过。
- `check-split-exports.js` 全部通过。
- `git diff --check` 通过，仅 Windows LF/CRLF 提示。

`project-management-production-selftest.mjs` 当前仍被隔离 fixture 中既有的 `tasks.json` 保留断言阻塞，与本阶段会话绑定链无关。

## 关键文件

- `backend/modules/projects/project-session-agent-binding.ts`
- `backend/modules/projects/project-session-compaction.ts`
- `backend/modules/projects/sessions.ts`
- `backend/modules/projects/project-lifecycle.ts`
- `backend/projects/chat-runs.ts`
- `backend/server.ts`
- `backend/server-pet-activity.ts`
- `backend/server-agent-runner.ts`
- `frontend/src/components/projects/useProjectManager.js`
- `scripts/project-session-native-binding-restart-selftest.mjs`
