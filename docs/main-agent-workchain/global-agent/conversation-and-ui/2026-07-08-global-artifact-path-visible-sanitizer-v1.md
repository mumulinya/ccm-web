# Global Artifact Path Visible Sanitizer v1

日期：2026-07-08

## 背景

全局主 Agent 已经会把 `CCM_AGENT_RECEIPT`、`trace_id`、`raw payload` 等内部协议从用户主文本移到技术详情。但当外部执行器或模型把 TestAgent 的证据文件路径直接写进最终回复时，用户仍可能看到本地绝对路径、`report.md`、`verdict.json` 或 `artifact-manifest.json` 这类技术归档细节。

## 本次升级

- 全局后端 `buildGlobalVisibleReplyContent()` 增加技术证据识别：
  - `test-agent-artifacts`
  - `artifact-manifest.json`
  - `report.md` / `report.json`
  - `verdict.json`
  - raw stack / stack trace
- 命中后，用户可见回复替换为友好说明，原始内容进入 `technical_content` 和技术详情。
- 全局历史同步复用同一清洗入口，旧消息如果包含证据路径，也会把路径移入技术详情。
- 前端全局流式展示、通用 Agent 展示 sanitizer、任务体验卡 sanitizer 同步加入兜底识别，防止旧 localStorage 历史或流式片段直接露出证据路径。

## 边界

这次只处理明显属于技术归档/排障的证据路径，不改变正常交付报告里的业务摘要、文件改动列表和验证结论。具体 artifact 文件仍保留在结构化技术数据中，供技术详情和排障使用。

## 验证

- `runGlobalAgentLoopSelfTest()` 覆盖普通问话返回 TestAgent artifact 路径时：
  - `final_reply` 不包含 `test-agent-artifacts`、`report.md`、`verdict.json`、`artifact-manifest.json`。
  - 原始路径进入 `final_report.technical_content` 和 `display_stream.technical_details`。
  - 普通问话不触发 plan mode。
- `runGlobalAgentHistorySyncSelfTest()` 覆盖历史消息里的 artifact 路径清洗。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加后端与前端 sanitizer 静态回归检查。
