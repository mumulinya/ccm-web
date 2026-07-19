# 群聊 `/compact` 手动压缩

## 用户入口

在群聊输入框输入 `/compact`，或在 CCM 命令中心选择截图中的 `/compact`。

本次将该命令从“Agent 工作流”改为“当前会话直接执行”。它不再向群聊主 Agent 发送一段“请检查是否需要压缩”的自然语言请求。

## 执行语义

- 只处理当前群聊的当前 `gcs_*` 会话。
- 使用 `force: true` 立即尝试压缩，不要求先达到自动 token 触发线。
- 调用群聊主 Agent 当前配置的模型生成摘要；模型不可用或摘要不合格时不提交压缩边界。
- 有可压缩旧消息时提交真实 `compactBoundary`，消息流显示“上下文已手动压缩”。
- 没有可压缩旧消息时返回“当前群聊会话没有可压缩的旧消息”，不生成伪边界。
- `/compcat` 不是别名，输入错误时按未知命令处理，避免误操作。

## 接口

```text
POST /api/groups/memory/compact
{
  "group_id": "...",
  "session_id": "gcs_..."
}
```

接口校验群聊存在、会话存在且会话 ID 为当前架构的 `gcs_*`。成功响应包含是否实际压缩、边界 ID、压缩旧消息数量和保留近期原文数量。

## 验证

- Slash Command 自测：通过；`compact_session` 为 group-only client action。
- 隔离 HOME 路由实测：40 条消息中压缩 14 条，保留 26 条，生成真实压缩边界。
- 路由隔离测试与模型摘要测试均使用模拟 Provider，不消耗真实模型额度；隔离数据已删除。
- Backend build：通过。
- Frontend build：通过，Vite 转换 2059 个模块。
- `git diff --check`：通过。

## 关键文件

- `backend/modules/tools/slash-commands.ts`
- `backend/modules/collaboration/group-routes-part-03.ts`
- `frontend/src/api/index.js`
- `frontend/src/composables/useSlashCommandClientActions.js`
- `frontend/src/components/collaboration/useGroupChat.js`
