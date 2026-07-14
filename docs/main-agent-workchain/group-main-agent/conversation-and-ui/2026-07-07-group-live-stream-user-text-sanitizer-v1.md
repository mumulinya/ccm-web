# 群聊实时流用户可见文本消毒 v1

## 背景

`D:\claude-code` 的 coordinator 规则强调：worker 的 `<task-notification>` 是内部信号，不是给用户看的对话；如果 worker 还没返回，主 Agent 只能告诉用户“仍在等待”，不能编造结果。

本项目后端已经在子 Agent 汇总、复盘和任务卡里做了协议词过滤，但群聊前端的实时 SSE 流仍会直接把 `chunk` / `agent_done` 文本写入消息。若某个第三方写代码 Agent 返回了 `CCM_AGENT_RECEIPT`、`trace_id`、`WorkerContextPacket` 或原始 payload，用户可能在普通消息气泡里看到内部协议。

## 本次升级

- `GroupChat.vue` 引入共享的用户可见文本清理能力。
- 新增 `GROUP_VISIBLE_INTERNAL_TEXT_PATTERN`，识别：
  - `CCM_AGENT_RECEIPT`
  - `<task-notification>`
  - `receipt-status`
  - `trace_id` / `session_id`
  - `WorkerContextPacket`
  - `raw receipt` / `raw payload`
  - `Runtime Kernel` 等内部运行词。
- 新增 `sanitizeGroupVisibleText`：
  - 普通文本保持换行和原结构，只替换“回执”等旧术语为“结果说明”。
  - 一旦发现内部协议词，用户可见区改成友好状态文案。
  - 技术内容仍由任务卡和技术详情承接。
- `chunk` 处理新增 raw buffer：
  - 支持内部词被拆成多个流式片段时仍能识别。
  - 被识别后，不再继续拼接原始技术内容到消息气泡。
- `agent_done`、单 Agent chunk、runtime fallback、status、error 都走同一层用户可见过滤。

## 用户体验

用户现在会看到：

```text
Agent 已提交技术执行信息，主 Agent 正在整理用户可读结论。
```

而不是：

```text
CCM_AGENT_RECEIPT ...
trace_id=...
WorkerContextPacket ...
```

这和 CC 的协作模式一致：子 Agent 的底层通知是主 Agent 的输入，不直接成为用户正文。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `groupLiveStreamsSanitizeInternalProtocol`，检查群聊实时流已经接入：

- 内部协议词识别正则。
- `sanitizeGroupVisibleText`。
- chunk raw buffer。
- 用户友好的 fallback 文案。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `git diff --check -- frontend/src/components/collaboration/GroupChat.vue scripts/main-agent-decision-ui-selftest.mjs docs/main-agent-workchain/group-main-agent/conversation-and-ui/2026-07-07-group-live-stream-user-text-sanitizer-v1.md`
- `npm run check`
- `npm --prefix frontend run build`
- `npm run test:chat-experience`
- `npm run test:render-regression`
- `npm run build`

以上验证均通过；空白检查只出现仓库既有的 CRLF 提示。
