# 状态追问子 Agent 等待情况 v1

## 背景

用户在任务执行中经常会问“做到哪了”“现在怎么样了”。参考 Claude Code 的 coordinator 语义，这类回复不能猜测子 Agent 还没返回的结果，只能汇总当前已知状态，并告诉用户还在等谁、哪些已经回来、哪些需要补齐。

之前群聊主 Agent 和全局主 Agent 已经能识别状态追问，并且不会为普通状态追问展示 Todo 或任务卡。但子 Agent 的等待/完成/缺口状态还不够明确，用户只能看到整体“处理中”。

## 本次升级

- 群聊主 Agent 新增 `ccm-group-child-agent-status-summary-v1`。
- 状态追问会展示：
  - 已完成的子 Agent。
  - 正在处理的子 Agent。
  - 等待中的子 Agent。
  - 需要补齐结果说明、验证证据或阻塞项的子 Agent。
- 群聊状态摘要优先读取任务卡里的 `agent_progress_summary`，再用结果说明状态和派发证据兜底。
- 全局主 Agent 的全局任务进展也新增“子 Agent 等待情况”，按已完成/处理中/等待中/待处理归纳子目标。
- 普通状态追问仍不显示 Todo、任务卡或技术协议。

## 用户可见策略

- 展示“已完成：web；处理中：api；待补齐：docs”这种用户能直接理解的语句。
- 明确说明不会猜测未返回的子 Agent 结果。
- `CCM_AGENT_RECEIPT`、`trace_id`、`session_id`、`task-notification`、原始 payload 等仍不会进入主文本。
- 技术记录继续默认折叠到任务卡“技术详情”里。

## 验证

计划继续运行：

- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run check`
- 相关运行时 selftest
- `npm run build`
