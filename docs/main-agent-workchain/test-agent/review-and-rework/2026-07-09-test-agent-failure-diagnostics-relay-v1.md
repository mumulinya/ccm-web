# TestAgent 失败诊断接入 v1

## 背景

TestAgent 已经在报告和 verdict 中提供 `failureSummary` 与 `diagnostics`。主 agent 需要消费这些结构化结果，让用户看到“哪里没过、下一步先看什么”，而不是暴露 report 路径、截图路径或原始协议字段。

## 改动

- 群聊主 agent：
  - 从 TestAgent report/verdict 合并 `failureSummary`。
  - 在复核回执和可见输出中新增“返工重点”和“排查建议”。
  - 原始截图、日志、report、artifact manifest 继续留在技术详情。
- 全局主 agent：
  - TestAgent relay 会读取 `failureSummary/diagnostics`。
  - 失败摘要会触发 `needs_rework`，阻塞最终验收。
  - 可见摘要显示友好的返工重点和排查建议。

## 用户体验

- 用户看到的是：
  - 哪个检查未通过；
  - 为什么需要返工；
  - 下一步优先排查什么。
- 用户默认看不到：
  - `ccm-test-agent-report-v1`；
  - `report.json` / `report.md`；
  - `artifact-manifest.json`；
  - 本地截图或日志绝对路径。

## 验证

- 群聊自测覆盖失败摘要、诊断建议和可见文本路径隐藏。
- 全局自测覆盖失败摘要 relay、UI 等待态和路径隐藏。
- 静态自检增加 TestAgent failure diagnostics 接入口检查。
