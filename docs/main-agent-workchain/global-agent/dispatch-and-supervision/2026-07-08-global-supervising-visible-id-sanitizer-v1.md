# Global Supervising Visible ID Sanitizer v1

日期：2026-07-08

## 背景

全局主 Agent 创建长期开发任务后，会进入 `supervising` 状态，由持久监工持续跟踪群聊/项目 Agent 的执行和验收。之前这条用户可见回复会直接展示“任务 ID”和“监工 ID”。这些 ID 对排障有用，但放在主文本里会让用户感觉像在看技术日志。

## 本次升级

- `supervising` 状态的主文本只保留用户需要知道的信息：
  - 任务已派发
  - 持久监工正在跟踪执行与验收
  - 当前只是已受理/监督中，不代表完成
  - 最终交付要等文件变更、验证和交付验收都通过
- `mission_id` 和 `supervisor_id` 不再拼进 `final_reply`。
- Mission/Supervisor 仍由 workchain 的技术详情记录，方便技术详情、Trace 和排障继续定位。

## 验证

- `runGlobalAgentLoopSelfTest()` 增加 `supervisingVisibleReplyHidesTechnicalIds`：
  - `final_reply` 不包含“任务 ID”“监工 ID”或具体 ID 值。
  - `display_stream.technical_details` 仍包含 Mission/Supervisor。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态回归检查，防止后续把 ID 字段重新放回用户主文本。
