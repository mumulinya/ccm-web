# 全局状态追问复核摘要 v1

日期：2026-07-09

## 背景

参考 `D:\claude-code\src\coordinator\coordinatorMode.ts`：worker/TestAgent 的结果通知只是内部信号，主 Agent 需要把它提炼成用户能理解的状态、缺口和下一步。

上一版已经让全局主 Agent 在 TestAgent relay 卡片里显示 `needs_user` / `needs_rework`。但用户过一会儿再问“现在进展怎么样”时，状态追问路径主要读取 `final_reply`、timeline 和 workchain 文本，可能遗漏 run 上的 `independent_review_summary` / `test_agent_review_summary`，甚至被旧的乐观 `final_reply` 误导。

## 改动

- `backend/modules/global/global-agent.ts`
  - 新增 `getGlobalStatusIndependentReviewSummary(...)` 和 `summarizeGlobalStatusIndependentReview(...)`。
  - 全局 standalone run、全局任务、全局直派任务的状态摘要都会提取独立复核摘要。
  - 当复核状态是“需返工”或“等你确认”时，进度追问优先展示复核结论，覆盖旧的“已完成”式 `final_reply`。
  - 只有用户可读的 headline、rows、next_action 会进入状态摘要；schema、report 路径、artifact manifest 不进入用户可见文本。

## 用户体验

用户追问“进展怎么样”时，如果 TestAgent 已指出缺口，会看到：

- 当前状态：返工中 / 需要处理。
- 独立复核：需返工 / 等你确认。
- 复核要点：具体缺口。
- 下一步：按复核缺口返工，修复后重新运行 TestAgent/独立复核，再给最终总结。

不会看到 `ccm-test-agent-report-v1`、`report.json`、`artifact-manifest.json` 或全局 run id。

## 验证

- 后端自测新增反例：`status=completed` 且 `final_reply` 声称完成，但 `independent_review_summary.status=needs_rework`。
- 预期状态追问显示“返工中”和复核缺口，不显示旧完成文案或技术字段。
