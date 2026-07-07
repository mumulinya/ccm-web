# 后端用户可见状态文案净化 v1

## 背景

参考 `D:\claude-code` 的 coordinator 规则：worker 通知、结构化结果、trace/session 等是内部技术信号；主 Agent 对用户说话时应该讲“结果说明、验证证据、技术详情”，不能把协议词直接暴露给用户。

上一轮已经处理了前端展示和群聊状态追问。本轮继续收敛后端会进入用户可见状态、总结或通知的文案。

## 本次升级

- 群聊主 Agent 创建任务后的下一步，从“等待子 Agent 执行和回执”改为“等待子 Agent 执行并提交结果说明”。
- 群聊主 Agent 记忆里的下一步，从“等待子 Agent 回执”改为“等待子 Agent 提交结果说明”。
- Todo/任务状态里的验收步骤，从“读取/等待子 Agent 回执”改为“读取/等待子 Agent 结果说明”。
- 全局直派完成同步文案不再展示“Trace 和内部回执”，改为“底层执行记录和排障信息仍保留在群聊任务卡的技术详情里”。
- 全局 Agent 飞书报告标题从“执行回执”改为“执行结果”。
- 全局任务默认验收文案从“子 Agent 提供回执”改为“子 Agent 提供结果说明”。
- 每日开发任务池的用户状态文案从“返回回执”改为“提交结果说明”。

## 守护

`scripts/main-agent-decision-ui-selftest.mjs` 新增后端用户可见术语检查，防止这些旧文案重新出现：

- `等待子 Agent 执行和回执`
- `等待子 Agent 回执`
- `已看到执行/回执/通知证据`
- `Trace 和内部回执`
- `全局 Agent 执行回执`
- `子 Agent 提供回执；主 Agent 输出最终报告`

## 验证

- `node scripts/main-agent-decision-ui-selftest.mjs` 通过
- `npm run check` 通过
- `npm run build` 通过
- `npm run test:chat-experience` 通过
- 构建后 `runCollaborationProtocolSelfTest` 通过
- 构建后 `runMainAgentProtocolSelfTest` 通过
- `git diff --check` 通过，只有仓库既有 CRLF 提示
