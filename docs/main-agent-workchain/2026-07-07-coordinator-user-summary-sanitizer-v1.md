# Coordinator 用户汇总清洗 v1

本轮目标：继续参考 `D:\claude-code` 的 coordinator 规则。Claude Code 明确要求 Worker 结果和系统通知只是内部信号，coordinator 每次对用户说话时都要把这些信号转成用户能理解的总结，而不是把 `<task-notification>`、回执协议或 trace 信息原样展示。

## 改动

- `backend/modules/collaboration/group-orchestrator.ts` 新增 `sanitizeCoordinatorUserText()`：
  - 清洗 `CCM_AGENT_RECEIPT`、`task-notification`、`receipt-status`、`trace_id`、`session_id`、`scratchpad`、raw payload 等内部词。
  - 输出统一改写为“子 Agent 结果、结构化结果说明、验证证据、技术详情”等用户可读表达。
- `runLlmCoordinatorSummary()` 增加提示约束：LLM 可以读取内部通知，但给用户的正文不能出现内部协议词。
- `runLlmCoordinatorReview()` 对 `summary`、`gaps`、`conflicts`、`checks.detail/evidence`、`worker_reviews`、`userQuestion` 和最终协调复盘正文做用户层清洗。
- follow-up 派发对象仍保留原始执行契约；只清洗展示在“我会继续追问”里的那一行，避免削弱子 Agent 工作单。

## 回归

- `runCoordinatorProtocolSelfTest()` 新增 `coordinatorUserSanitizerPass`。
- `scripts/main-agent-decision-ui-selftest.mjs` 新增源码级检查，确保 coordinator 用户汇总清洗不会被移除。

## 用户体验规则

- 子 Agent 的 XML 通知、结构化结果说明和 trace/session 属于技术详情。
- 用户看到的是：已完成什么、还缺什么、哪个项目需要继续补充、主 Agent 下一步怎么收敛。
- 主 Agent 可以使用内部协议做验收，但不能把内部协议当作用户需要理解的内容。
