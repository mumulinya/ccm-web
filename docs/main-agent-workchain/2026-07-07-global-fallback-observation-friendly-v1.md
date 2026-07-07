# 全局 Agent 兜底观察摘要友好化 V1

本轮目标：统一大模型不可用、全局 Agent 使用本地兜底决策时，完成回复不能把工具 observation JSON 直接展示给用户。

## 问题

旧逻辑在工具执行后会拼接类似“执行观察：{...}”的原始对象。这里可能包含 trace、内部协议、结构化回执或大量调试字段，不适合出现在用户正文里。

## 本次实现

- 新增 `summarizeGlobalToolObservationForUser()`。
- 优先提取 `summary`、`message`、`reply` 等自然摘要。
- 如果观察结果包含内部协议字段，会替换成“详细信息已放入技术详情”的友好说明。
- 对列表类结果只展示“返回 N 条结果”，详细记录仍留在技术详情。
- 对异步受理类结果明确说明“已受理不代表最终完成”。

## 验证

- `runGlobalAgentIntentSelfTest()` 新增 `fallbackObservationFriendly`：
  - 不出现 JSON 大括号。
  - 不出现 `trace_id`。
  - 不出现内部回执协议。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态检查，防止恢复 `JSON.stringify(last.observation)`。

