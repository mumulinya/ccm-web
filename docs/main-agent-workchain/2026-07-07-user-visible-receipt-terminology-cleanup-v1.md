# 用户可见结果说明术语清理 v1

## 背景

主 Agent 链路里，`receipt` 仍然是内部协议和数据字段名，但直接给用户展示“回执”不够自然，也容易让用户误解为底层通信细节。

本项目已经把群聊主 Agent、全局主 Agent、任务卡、执行摘要里的用户可见文案统一为“结果说明”。本轮自测发现记忆中心仍有少量历史诊断文案使用“回执”。

## 本次升级

- `MemoryCenter.vue` 中用户可见的“需补回执”改为“需补结果说明”。
- `require_usage_receipt` 的展示标签从“要求回执”改为“要求结果说明”。
- “最近子 Agent 回执”改为“最近子 Agent 结果说明”。

内部字段名、数据结构、协议枚举保持不变，避免影响已有存储和后端协作逻辑。

## 用户体验

用户在记忆中心看到的是子 Agent 是否补充了可理解的结果说明，而不是底层 receipt 概念。技术字段仍可在详情或原始结构中排查。

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs`：通过，`userVisibleReceiptTerminologyPolished` 已恢复为 true。
- `npm run check`：通过。
- `npm --prefix frontend run build`：通过。
- `npm run test:chat-experience`：通过。
- `npm run test:render-regression`：通过。
- `npm run build`：通过。
