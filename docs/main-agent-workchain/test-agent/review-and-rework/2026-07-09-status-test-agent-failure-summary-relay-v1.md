# 状态追问 TestAgent 失败摘要接力 v1

## 背景

上一轮已经让即时事件和最终 workchain 总结消费 TestAgent 的 `failureSummary` / `diagnostics`。这次补齐“用户稍后追问进度”的状态链路：如果任务或全局运行只保存了 TestAgent report/verdict，没有额外包装 `independent_review_summary`，主 agent 仍应能告诉用户当前需要返工，而不是沿用旧的“已完成”文案。

## 改动

- 群聊主 agent 状态摘要会从任务卡、delivery report、technical 中递归提取 TestAgent `failureSummary`。
- 全局主 agent 状态摘要会从全局运行、final report、workchain/display stream 中递归提取 TestAgent `failureSummary`。
- 提取结果会合成为用户可读的独立复核摘要：
  - `独立复核：需返工` 或 `等你确认`
  - `返工重点`
  - `排查建议`
  - `重新运行 TestAgent/独立复核`
- report、artifact manifest、本地截图路径和内部 schema 不进入状态回复主文本。

## 用户体验

用户问“现在进展怎么样”时，即使底层只有 TestAgent 原始报告，也会看到：

- 当前不是完成状态；
- TestAgent 复核指出的失败类型和原因；
- 下一步先返工，再重新运行 TestAgent/独立复核。

技术记录仍默认留在技术详情里。

## 验证

- 群聊状态自测新增 `groupStatusSynthesizesTestAgentFailureSummary`。
- 全局状态自测新增 `globalStatusSynthesizesTestAgentFailureSummary`。
- 静态自检覆盖新增的 failureSummary-only 状态追问链路。
