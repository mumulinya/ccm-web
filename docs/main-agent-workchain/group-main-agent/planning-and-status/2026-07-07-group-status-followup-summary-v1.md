# 群聊主 Agent 状态追问摘要 v1

## 背景

用户在群聊里问“进展怎么样”“做到哪了”“有结果了吗”时，期望看到当前任务状态，而不是再创建一个任务卡或 Todo。这个行为需要和全局主 Agent 的状态追问保持一致：只报告已经知道的事实，不猜测还没返回的子 Agent 结果，底层技术记录继续放在技术详情里。

## 本次升级

- 新增 `isGroupProgressStatusRequest`，识别群聊状态追问，并避免把“把任务状态设置为 done”这类管理/修改意图误判成查询。
- 新增 `buildGroupStatusFollowupSummary`，复用群聊主 Agent 状态卡数据，生成用户能直接读懂的普通文本摘要。
- `/api/groups/send` 在命中状态追问时走 SSE 普通回复：
  - 保存用户消息和主 Agent 回复。
  - 不创建持久任务。
  - 不展示任务卡或 Todo。
  - 不派发子 Agent。
  - 回复中包含最近任务、当前进展、运行中的子 Agent、待确认问答、阻塞/需要处理项和下一步。
- 状态摘要会过滤 `CCM_AGENT_RECEIPT`、`<task-notification>`、`trace_id`、`session_id`、`WorkerContextPacket`、`raw payload` 等内部协议词。

## 用户可见体验

当用户在群聊主 Agent 中问：

```text
现在进展怎么样了？
```

主 Agent 会直接回复类似：

```text
最近群聊任务进展：优化群聊主 Agent 工作链路，当前状态是正在处理。
当前进展：主 Agent 已派发子 Agent，等待 web 和 api 返回验证结果。
子 Agent：web、api 正在处理。
待确认：还有 1 个 Agent 问答需要处理。
还需要：补齐验证证据。
下一步：我会等子 Agent 返回可验收结果后再汇总，不会提前编造结果。
我不会猜测还没返回的子 Agent 结果；底层记录默认收在任务卡的技术详情里。
```

## 自测

- `node scripts/main-agent-decision-ui-selftest.mjs` 通过
- `npm run check` 通过
- `npm run build` 通过
- `npm run test:chat-experience` 通过
- `npm run test:render-regression` 通过，已生成真实渲染截图
- `npm run test:replay-regression` 通过，已生成 replay 截图
- `node -e "const mod = require('./ccm-package/dist/modules/collaboration/group-routes.js'); const result = mod.runGroupStatusFollowupSelfTest(); ..."` 通过
- 构建后协作模块自测 `runCollaborationProtocolSelfTest` 通过
- `git diff --check` 通过，只有仓库既有 CRLF 提示
