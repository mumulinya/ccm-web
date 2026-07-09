# Workchain TestAgent 失败摘要门禁 v1

## 背景

TestAgent 已经能输出 `failureSummary` 和 `diagnostics`，上一轮主 agent relay 已能把这些内容展示给用户。但最终总结质量门禁还主要依赖 `independent_review_gate` 和普通复核行；如果某个入口只带 TestAgent report，而没有显式设置 gate，workchain 仍可能过度相信“已完成”类文本。

## 改动

- `buildMainAgentWorkchain(...)` 现在会从 summary、completion、technical 中提取 TestAgent `failureSummary`。
- 只要 TestAgent 失败摘要表明需要返工，独立复核 gate 会自动视为未通过。
- 用户可见总结会显示具体失败点，例如浏览器检查未通过，而不是只说“已完成”。
- 诊断建议进入“复核与验收”和下一步动作。
- 本地截图、report、artifact manifest 路径会被替换为“技术详情里的证据文件”。

## 用户体验

当 TestAgent 发现失败时，用户会看到：

- 这轮还不能算完成；
- TestAgent 复核未通过的具体原因；
- 下一步应先按诊断修复，再重新运行 TestAgent/独立复核。

技术细节仍默认折叠，不进入主文本。

## 验证

- `runMainAgentWorkchainSelfTest()` 增加 `testAgentFailureSummaryBlocksFalseCompletion`。
- 静态自检 `backendBuildsFinalSummaryQualityGate` 检查 workchain 已接入 `collectTestAgentFailureSummary(...)`。
