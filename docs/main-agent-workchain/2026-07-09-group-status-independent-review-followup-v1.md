# 群聊状态追问复核摘要 v1

日期：2026-07-09

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts`：执行成员/TestAgent 的结果通知是内部信号，群聊主 Agent 对用户说话时要总结状态、缺口和下一步。

全局主 Agent 已经能在用户追问“进展怎么样”时复述 TestAgent/独立复核的返工状态。群聊主 Agent 也需要同样能力：如果任务表层状态或旧交付摘要写着“已完成”，但 `independent_review_summary` / `test_agent_review_summary` 说“需返工”或“等你确认”，进度追问不能沿用旧完成口径。

## 改动

- `backend/modules/collaboration/group-routes.ts`
  - 新增 `getGroupStatusIndependentReviewSummary(...)` 和 `summarizeGroupStatusIndependentReview(...)`。
  - `buildGroupMainAgentStatus(...)` 会从任务交付摘要、任务卡和技术区提取独立复核摘要。
  - 复核为“需返工”时，群聊状态纠正为“返工中”；复核为“等你确认”时，状态纠正为“等待你确认”。
  - `buildGroupStatusFollowupSummary(...)` 会显示“独立复核”和“复核要点”，并优先用复核下一步覆盖旧完成式下一步。
  - 阻塞性复核存在时，不展示旧的完成式交付总结和 pickup 摘要。

## 用户体验

用户在群协作对话里问“现在进展怎么样”时，如果 TestAgent 已指出缺口，会看到：

- 当前状态是返工中 / 等待你确认。
- 当前进展来自复核结论。
- 复核要点列出具体缺口。
- 下一步说明先返工或等用户确认，之后重新运行 TestAgent/独立复核，再给最终总结。

不会看到 `ccm-test-agent-report-v1`、`report.json`、`artifact-manifest.json` 或任务 id。

## 验证

- `runGroupStatusFollowupSelfTest()` 新增反例：
  - 任务状态是 `completed`。
  - 旧摘要写“任务已完成，可以查看改动详情”。
  - 独立复核摘要是 `needs_rework`。
  - 预期进度追问显示“返工中”和复核缺口，不显示旧完成文案或技术字段。
