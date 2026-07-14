# 子 Agent 通知用户摘要清洗 v1

本轮目标：继续对齐 `D:\claude-code` 的 coordinator 链路。Claude Code 中 Worker 完成后会用 `<task-notification>` 作为内部信号交给 coordinator，用户看到的是 coordinator 的总结，而不是 XML、回执协议或 Worker 原始响应。

## 改动

- `backend/modules/collaboration/agent-notifications.ts` 新增用户摘要清洗：
  - 缺少结构化结果说明时，摘要改为“子 Agent 已返回结果，但缺少可验收的结构化结果说明。”
  - `<task-notification>`、`receipt-status`、`CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、raw payload 等内部词不会进入 notification 的 `summary/result` 用户版字段。
  - 内部 XML envelope 仍保留，供主 Agent 识别子 Agent 完成信号。
- `backend/modules/collaboration/collaboration.ts` 将前置依赖、缺口续跑草稿和验收 follow-up 的外层原因改成“执行结果/结构化结果说明”语义。
- 同步群聊任务卡本地 timeline 标签映射，让 `plan_mode_revision_requested`、`reasoning_recovery_check`、`global_supervisor_rework` 等阶段在卡片和 workchain 中显示一致的用户文案。
- 自测新增 `runTaskNotificationDisplaySelfTest()`，覆盖：
  - 内部 `<task-notification>` 仍存在；
  - 缺结果说明时摘要友好；
  - 用户版摘要和结果预览不泄漏协议词；
  - 完成态 receipt summary 能保留业务摘要。

## 用户体验规则

- 普通用户不需要理解 `CCM_AGENT_RECEIPT` 或 `<task-notification>`。
- 主 Agent 对用户说的是：哪个子 Agent 做了什么、是否完成、缺什么、下一步怎么收敛。
- 协议、Trace、session、原始结果说明和执行器排障信息继续默认放入技术详情或后端执行记录。
