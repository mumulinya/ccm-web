# Global Resume Feedback Workchain v1

## 背景

质量补齐卡片已经能发出 `continue` action，并携带“补齐交付证据、验证结果、验收结论”这类预设消息。群聊任务卡会把这条消息写入同一任务的 followup/timeline；但全局主 Agent 的普通 `resume` 分支此前只把运行状态恢复为 running，没有把这条继续反馈写入下一轮决策上下文。

这会导致用户点击“继续补齐总结”后，全局主 Agent 有可能只恢复运行，却没有明确知道本轮恢复是为了补齐交付总结。

## 改动

- 全局主 Agent 新增 `applyGlobalResumeFeedback(...)`：
  - 清洗用户补充内容，避免内部协议或 artifact 路径进入用户主文本。
  - 写入 `last_resume_feedback` / `resume_feedback_history`。
  - 写入 run history，下一轮模型决策能看到“继续处理时补充要求”。
  - 写入 reasoning facts 和 `resume_feedback` assertion。
  - 写入 runtime output 和 trace event。
- `/api/global-agent/runs/resume` 和后台 runtime resume 都会传递 `message` / `feedback` / `source`。
- 全局任务卡的 `continue` action 会把 `action.source` 一并传给后端，例如 `quality_followup`。
- public run payload 暴露干净的 resume feedback 字段，方便技术详情或后续 UI 使用。

## 用户可见行为

- 用户点击“继续补齐总结”后，全局主 Agent 会把这次继续明确理解为补齐交付总结，而不是普通恢复。
- 用户主文本仍保持友好表达，不展示 trace、receipt、raw payload 等内部字段。
- 技术详情可以看到 resume feedback 的结构化记录。

## 边界

- 本次只修改全局主 Agent 连接层和前端 action 传参。
- 不修改 `backend/test-agent` 的业务流程、验证策略、artifact、verdict 或 CLI。
- 群聊任务的 `/api/tasks/continue` 既有 followup/timeline 链路保持不变。

## 验证

- `runGlobalAgentLoopSelfTest()` 新增 `globalResumeCarriesFeedback`：
  - 暂停中的全局运行恢复时携带质量补齐反馈。
  - 断言反馈进入 history、reasoning facts、assertion、resume feedback history 和 live event。
- `scripts/main-agent-decision-ui-selftest.mjs` 新增静态守卫：
  - 前端全局 `continue` action 传递 `action.source`。
  - 后端存在 `applyGlobalResumeFeedback`、`resume_feedback` runtime output 和 public payload 字段。
