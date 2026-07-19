# 会话记忆真实投影与流水状态清理

## 问题

记忆中心曾把群聊主 Agent 的本地结构化运行状态展示为正式会话记忆：

- 普通用户消息 `111` 被展示成“事实”。
- `Agent intent gateway` 的当轮路由判断被重复展示成“决策”。
- “直接回复用户”等已经结束的流程动作被展示成“下一步”。
- `deterministic_structured_fallback` 因为 `hasSummary=true` 被错误标成 Session Memory `ready`。
- 页面允许编辑、固定和删除这些运行时字段，容易让展示层反向污染记忆。

## 正确边界

精确会话页现在只展示：

1. 经验证的模型压缩摘要或模型 Session Memory。
2. compact boundary 后的真实近期原文，仅作为只读上下文展示。
3. 真实模型上下文 Token、自动压缩阈值、近期窗口、熔断和压缩后门禁。

`factAnchors / decisions / nextActions` 不再是会话记忆面板；不会被作为模型摘要，也不会直接注入群聊主 Agent、项目子 Agent 或全局 Agent 的群聊投影。

## 运行状态处理

- 普通闲聊和只读项目回答不再向群聊记忆写入路由决策与“下一步”。
- 旧的流水数据不作为正式上下文；它们可继续留在审计或故障追溯数据中。
- 仍需要跨轮保留的用户约束、架构决策和文件线索，必须通过持久要求或 typed memory 准入，不再依赖流水数组。
- 模型上下文前增加准入过滤，排除 intent gateway、普通回复、纯数字消息和已完成的临时动作。

## Session Memory 门禁

Session Memory 只在以下条件同时成立时进入模型上下文：

- `modelExtracted === true`
- `hasSummary === true`
- `markdownExists === true`
- `markdownChecksumMatches === true`

本地 deterministic fallback 只作为保真参考，页面显示为“等待模型抽取”，不再标记为 ready，不进入子 Agent 上下文。

## 当前真实会话验证

截图对应会话修正后：

- 当前模型上下文：`14,946 tokens`。
- 近期原文：`37 tokens / 2 条`。
- 正式摘要：尚未生成。
- Session Memory：等待模型抽取。
- 页面只显示用户原文和 Agent 原文，两条均只读。

## 验证

- `npm run check`：通过。
- backend/frontend production build：通过。
- `npm run test:group-runtime-memory-admission`：10 项通过。
- `npm run test:memory-center-scope-hierarchy`：20 项通过。
- `npm run test:global-memory-center-sessions`：16 项通过。
- Playwright 桌面与手机视口通过，近期原文无编辑/删除操作，页面无横向溢出。
- 测试未调用付费 Provider。

## 代码入口

- `backend/modules/knowledge/memory-control-center-api.ts`
- `backend/modules/collaboration/group-runtime-memory-admission.ts`
- `backend/modules/collaboration/group-memory-context-part-01.ts`
- `backend/modules/collaboration/group-memory-context-part-03-part-01.ts`
- `backend/modules/collaboration/group-memory-context-part-04-part-01.ts`
- `backend/modules/collaboration/group-memory-context-part-04-part-02.ts`
- `backend/modules/collaboration/group-live-routes-part-02-part-02.ts`
- `frontend/src/components/knowledge/MemoryCenterPanel.vue`
