# Agent 可视化与任务会话生命周期 18.0

## 目标

让 CCM 更像 Codex / Cursor：用户看到的是清晰的工作阶段和操作入口，而不是内部协议、门禁和 session 细节；同时保证任务未真正终态前，子 Agent 任务会话不会被误关闭。

## 用户视图简化

群聊和项目会话的工作输出面板增加 `sanitizeUserVisibleWorkText`。

当输出包含以下内部信息时，用户视图会折叠成人话：

- `CCM_AGENT_RECEIPT`
- `CCM_AGENT_REQUESTS`
- `scratchpad`
- `trace_id`
- `session_ids`
- `native_session`
- `task_agent_session`
- `shouldDelegate`
- 门禁 / 回执要求 / 任务级原生会话

示例：

```text
Agent 已提交结构化完成信息，系统正在汇总验收。
Agent 正在处理内部执行细节，已为用户视图折叠。
Agent 遇到内部执行保护或权限问题，详情已折叠，可在技术详情中排查。
```

后台原始数据仍保留，方便 Trace、技术详情和问题排查。

## 任务会话生命周期规则

持久任务会话只在明确终态后关闭：

- `done`
- `cancelled`
- `archived`
- `deleted`

以下状态必须保留会话，方便返工 / 续跑 / 恢复：

- `in_progress`
- `failed`
- `paused`
- waiting dependency
- reviewing
- rework
- blocked

特殊情况：

- 用户主动取消任务：关闭会话。
- 安全撤销 / 删除归档：关闭会话。
- 执行器切换：旧执行器会话可关闭，新执行器重新建立承接会话。

## 验证

新增/强化断言：

- `persistentTaskKeepsSessionOnFailed`
- `persistentTaskKeepsSessionOnPaused`
- `persistentTaskClosesAfterCancelled`
- `persistentTaskClosesAfterArchived`
- `groupWorkPanelSanitizesInternalProtocol`

验证命令：

```bash
npm run test:chat-experience
npm run test:coordinator
npm run check
```
