# Progress Refresh Summary V1

日期：2026-07-07

## 背景

参考 Claude Code 的任务/Todo 提醒思路，主 Agent 在真实任务长时间没有新进展时，需要给用户一个可理解的状态说明：现在卡在哪里、主 Agent 会如何接续、技术记录在哪里看。普通问话仍然不能展示 Todo 或任务提醒。

## 本次升级

- 群聊主 Agent 状态新增 `ccm-group-main-agent-progress-refresh-v1`。
- 群聊状态追问会输出“进度刷新提醒”和“接续要点”，并继续隐藏 `trace_id`、`session_id`、`CCM_AGENT_RECEIPT` 等内部协议内容。
- 全局任务状态追问新增同类“进度刷新提醒”，用于说明下游 Agent 或群聊任务卡长时间无新进展时的接续动作。
- 全局流式卡新增 `progress_refresh_summary` 渲染入口，未来后端/回放数据带上该摘要时，会在用户可见区展示友好文本。

## 用户可见策略

- 只在真实任务/状态追问里展示。
- 普通问话不展示 Todo、任务卡或进度刷新提醒。
- 技术细节默认仍放入“技术详情”折叠区。
- 可见文本只表达业务状态和下一步，不展示底层 trace、session、raw payload。

## 验证

- 源码自测覆盖群聊和全局进度刷新摘要字段。
- Playwright 真实渲染回归覆盖群聊状态卡和全局流式卡。
- 回归断言确认用户可见提醒出现，同时 `trace_id` 不可见。
