# 普通问话回复与换行展示优化

## 问题

普通寒暄“你好啊”被错误补成“处理总结、验证与验收、下一步”等任务交付栏目，而且消息清洗把换行压成空格，列表最终显示为一整段。

## 展示规则

- 无工具调用、无持久任务、无执行授权的普通问话只显示自然回复。
- 普通问话不显示 Todo、处理总结、验证与验收、下一步或运行技术详情。
- 真实执行任务完成后仍展示用户可读的交付总结，内部协议继续放在默认折叠的技术详情中。
- 全局 Agent 与群聊 Agent 的消息正文保留单换行和空段落；三个以上连续换行收敛为一个空段落。
- 群聊 Agent 消息使用 `white-space: pre-wrap` 和安全换行，长文本可以正常折行。

## 实现

- 全局普通问话判断不再依赖必须存在的意图类别；只要没有工具、任务和执行要求，就进入安静对话模式。
- `formatMainAgentCompletionReply` 对 `conversation` 模式直接保留自然回复，即使工作链中误带合成证据也不生成任务总结。
- 前端用户文本清洗改为逐行归一空格，保留 `\n` 和段落边界。
- 普通全局问话不再渲染运行技术详情；真实执行意图仍可展开技术详情。

## 验证

- `npm run check`：通过。
- `npm run build:frontend`：通过。
- `npm run build:backend`：通过。
- `runMainAgentWorkchainSelfTest`：通过，包含普通问话误带合成证据仍保持自然回复的回归。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `npm run test:main-agent-runtime-e2e`：通过，普通全局问话无 Todo，普通群聊问话不创建任务。
- 前端换行断言：输入段落与列表后，输出保留单换行和一个空段落。
- Playwright 新增真实渲染用例：通过 DOM 文本与计算样式检查，`white-space` 为 `pre-wrap`，截图输出到 `scratch/render-regression/01b-ordinary-multiline-reply.png`。
- 完整 `test:render-regression` 在本次新增用例通过后，被后续既有断言“等待用户补充的全局通知恢复后应改回 active mission 消息类型”拦截；该失败不属于普通回复或换行用例，本记录不将完整截图套件标记为通过。
