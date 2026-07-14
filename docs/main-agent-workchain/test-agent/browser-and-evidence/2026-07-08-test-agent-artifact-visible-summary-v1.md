# TestAgent 证据归档可见摘要 v1

日期：2026-07-08

## 背景

群聊主 Agent 已经能把独立复核派发到 TestAgent CLI，并拿到 `report.json`、`report.md`、`verdict.json` 和 `artifact-manifest.json` 等证据。之前复核完成文本会直接把本地报告目录和 Markdown 报告路径写进用户可见摘要，不符合“用户主文本只看结论，技术内容放入技术详情”的体验目标。

## 本次升级

- TestAgent 复核完成时，用户可见摘要只展示：
  - 复核对象
  - 结论
  - 验证证据摘要
  - 阻塞/风险摘要
  - “证据归档已放入技术详情”
- 本地绝对路径、report/verdict/manifest 文件名继续保留在结构化 `CCM_AGENT_RECEIPT.testAgentReport.artifactFiles` 中。
- 主 Agent 后续汇总、排障和技术详情仍能读取完整 artifact 信息。
- 不修改 `backend/test-agent` 的业务流程；TestAgent 的报告、verdict 和 manifest 仍由独立模块负责。

## 验证点

- 协议自测覆盖：用户可见段不能出现 `C:/tmp`、`report.md`、`verdict.json`、`artifact-manifest.json` 等底层路径/文件名。
- 协议自测覆盖：结构化 receipt 中仍保留 `reportMarkdownPath` 和 `manifestPath`。
- 静态自测覆盖：主 Agent 连接层必须保留“证据归档”和 `artifactFiles.manifestPath` 检查。
