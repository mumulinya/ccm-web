# 群聊压缩事件与 Token 触发规则

## 本次目标

让群聊会话在真正完成上下文压缩后，像 Codex 一样在消息流显示一条简洁记录，并确保自动压缩由模型上下文容量驱动，而不是由消息条数驱动。

## 完成内容

- 群聊消息流会从已提交的 `compactBoundary` 派生“上下文已自动压缩”记录。
- 手动压缩显示“上下文已手动压缩”，避免把用户操作误报为自动行为。
- 记录绑定当前 `group + gcs_*`，切换群聊或会话不会串线。
- 记录不写回聊天消息，不参与 token 计算，也不会再次触发压缩。
- 事件放在 `summarizedThroughMessageId` 之后；该消息不在当前加载窗口时，按压缩时间定位。
- 删除“活跃消息达到 120 条就压缩”的旧兜底。短消息再多也不会仅因条数触发。

## 自动压缩时机

每次当前群聊会话新增消息后，后台约 2.5 秒执行一次压力检查。只有当前会话存在可压缩的旧消息，并满足以下条件之一时才执行主压缩：

1. 当前模型可见上下文达到自动压缩 token 阈值。
2. 用户明确执行手动压缩。
3. 已进入受控的部分压缩流程。

自动模式没有可信模型容量时使用 Claude Code 风格的保守容量：

```text
200,000 模型窗口
- 20,000 输出预留
- 13,000 auto-compact 缓冲
= 167,000 token 自动压缩触发线
```

Memory Center 还提供：

- `516K`：窗口 `516,000`，触发线 `460,000`。
- `1M`：窗口 `1,000,000`，触发线 `900,000`。
- `自定义`：使用用户设置的窗口和触发线。

判断依据是当前 `gcs_*` 的旧消息、近期原文和已有会话摘要的 token 总量。子 Agent 最终派发还会单独执行模型可见输入门禁，避免压缩后或 Provider 实测偏差仍超过容量。

## Claude Code 对照

- `D:/claude-code/src/services/compact/autoCompact.ts`：使用 `tokenCountWithEstimation(messages)` 与模型自动压缩阈值比较。
- `D:/claude-code/src/utils/tokens.ts`：使用最近 API usage 加新增消息估算当前上下文，不以消息条数作为主触发条件。

## 验证

- Frontend build：通过，Vite 转换 `2059` 个模块。
- Backend build：通过。
- 事件派生测试：自动/手动标签和消息位置全部通过。
- 120 条短消息回归：`421 / 167,000 token`，未压缩。
- `git diff --check`：通过。
- 浏览器检查：真实群聊页正常加载；当前会话仅约 `1,891 token`，低于触发线，因此没有伪造压缩记录。

## 关键文件

- `frontend/src/components/collaboration/ContextCompactionEvent.vue`
- `frontend/src/components/collaboration/groupChatHelpers.js`
- `frontend/src/components/collaboration/useGroupChat.js`
- `frontend/src/components/collaboration/GroupChat.template.html`
- `backend/modules/collaboration/group-compaction-engine-part-02.ts`
