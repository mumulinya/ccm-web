# 协调者复盘可见文本清洗 v1

## 背景

Claude Code coordinator 的原则是：子 Agent 完成通知、结构化结果说明、trace、session、scratchpad 等都是内部信号，主 Agent 要把它们综合成用户能看懂的结论。用户正文不应该直接看到协议文本，技术细节默认进入技术详情。

项目里已有多处前端和后端清洗，但群聊主 Agent 的复盘/最终验收消息仍存在一条薄路径：`appendCoordinatorMessage()` 会把传入内容直接写入消息正文。如果上游复盘内容拼接了原始门禁原因、第三方 Agent 输出或通知片段，就可能让内部协议词进入用户可见文本。

## 本次升级

- 新增 `buildCoordinatorVisibleMessageContent()`。
- `appendCoordinatorMessage()` 写入群聊消息前会统一生成用户可见正文。
- 如果正文被清洗/改写，原始内容写入 `technical_content`，供技术详情保留。
- SSE `agent_done.text` 也使用清洗后的可见文本，避免流式过程中短暂露出内部协议。

## 用户可见效果

- 复盘/最终验收消息继续保留“协调复盘、缺口、下一步”等用户可读信息。
- `<task-notification>`、`CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、`scratchpad` 等不会出现在主文本框。
- 技术内容仍可通过结构化元数据/技术详情保留，不丢失排障线索。

## 回归覆盖

- `getCoordinatorVisibleMessageSelfTest()` 验证：
  - 带内部协议的复盘文本会被清洗。
  - 清洗后仍保留 Agent 名称和结果含义。
  - 普通友好复盘文本不会被误伤。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态扫描，确认 `appendCoordinatorMessage()` 使用可见正文并保存 `technical_content`。
