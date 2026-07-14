# 子 Agent 进展摘要 v1

## 目标

参考 Claude Code 的子 agent 后台摘要/完成通知机制，把群聊主 Agent 和全局主 Agent 的子 Agent 进展整理成用户能直接看懂的摘要。用户不需要打开技术详情，也能知道每个子 Agent 当前在做什么、有没有证据、下一步是什么。

## 实现

- 后端任务卡新增 `ccm-child-agent-progress-summary-v1`，从派发证据、执行记录、会话、工作项、子 Agent 通知和回执中推导状态。
- 前端 `TaskExperienceCard` 新增“子 Agent 进展摘要”区块，展示 Agent、角色、状态、当前重点、文件/验证证据、阻塞和下一步。
- 全局任务卡在没有后端字段时，会从 mission children 和 work items 推导同样的摘要结构。
- 普通问话仍不创建任务卡，也不会显示 Todo 或子 Agent 摘要。
- Trace、session、WorkerContextPacket、`CCM_AGENT_RECEIPT` 等内部协议词仍默认留在技术详情或被过滤。

## 验证计划

- 静态自检覆盖后端生成、前端渲染、全局卡推导和自测断言。
- 后端协作 UX 自测覆盖完成态、等待态和协议词隐藏。
- Playwright 渲染回归覆盖群聊完成卡、执行队列卡、全局历史卡的真实显示。
