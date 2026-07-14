# 全局、群聊主 Agent 与 TestAgent 责任链纠正

## 目标

统一复杂任务的实际执行链路：

`全局 Agent -> 群聊主 Agent -> 项目子 Agent -> 群聊主 Agent 验收 -> TestAgent -> 群聊主 Agent 返工/复验/总结 -> 全局 Agent 转发状态和最终结果`

全局 Agent 不得直接调用 TestAgent、构造 TestAgent 交接单、解释 TestAgent 裁决后直接安排项目返工，或把自己标记为独立复核负责人。

## 实现

- 全局单项目目标会解析到包含该项目的真实协作群，持久子任务的 `assign_type` 为 `group`，`target_project` 为群聊协调者。
- 显式群聊目标和由项目转换的群聊目标都持久化 `ccm-global-group-test-agent-ownership-v1` 责任契约。
- 全局 Agent 的 `send_project_cmd`、`orchestrate_development` 和 `create_task` 全部进入持久全局任务与群聊主 Agent 链路。
- Web 与飞书的 `create_task` 不再走缺少完整字段的旧日常任务直建接口。
- 删除全局合成协调者直接运行 TestAgent 的 `runDirectProjectIndependentReview` 路径及全局监督器中的直接复核返工分支。
- 非群聊项目任务若要求独立复核会失败关闭，明确要求先交给真实群聊主 Agent。
- 群聊主 Agent 仍负责 TestAgent 交接单、计划预检、CLI 执行、裁决消费、完成前抽查、返工和复验。
- TestAgent 验收标准会过滤“群聊主 Agent 必须验收/总结”等编排职责，只复核可由命令、HTTP 或浏览器证据验证的产品标准。
- 项目子 Agent 回执中的“等待主 Agent 验收”属于协调者下一步，不再被误判成外部阻塞。
- 同一项目、同一任务级原生会话的返工回执可以继承此前已批准的结构化 ACK；不同会话不能继承。
- TestAgent 首次失败后若同一 TestAgent 已返回成功复测结果，完成门禁只以最新通知判断，历史失败仍保留在技术详情中。
- 项目内部 `export_added` 且没有显式消费者时不生成跨 Agent 契约注入，避免把 TestAgent 误当成业务契约消费者。
- 读取计划重验按任务会话的最新轮次执行；第三方代码 Agent 可用绑定会话内的具体文件重读动作，或真实文件变更加 `git diff` 核验，证明已基于当前源码工作，无需向用户暴露内部 gate/read-plan ID。
- 泛化的“主 Agent 需要用户补充”没有具体问题时不制造用户阻塞；真实缺少路径、账号、选择或确认内容仍保持阻塞。
- 独立复核返工循环预算为 5 轮，覆盖首次 TestAgent、项目返工、TestAgent 复测、可选抽查返工和最终验收。
- 核心 `tasks.json` 原子替换增加 Windows `EPERM/EACCES/EBUSY` 重试，避免最终验收时间线偶发丢失。
- 全局状态快捷识别不再截获包含“进度/持续跟进”的明确开发执行指令。

## 防回归

新增 `scripts/main-agent-test-agent-ownership-selftest.mjs`，守卫以下边界：

- 全局模块不能调用 TestAgent CLI。
- 全局模块不能构造 TestAgent 交接单。
- 不能恢复合成 `global-agent` 协调者或复核者。
- 项目目标必须解析到真实协作群。
- `create_task` 必须创建持久群聊任务。
- TestAgent 原生执行只能保留在群聊协调链路。
- 全局只保留来自群聊事件的只读展示转发。

真实链路测试补充断言：全局子任务必须属于真实群聊，目标必须是协调者，并持久化群聊计划、项目子 Agent 派发、群聊验收、TestAgent 执行和最终总结。

## 验证结果

- `npm run check`：通过。
- `npm run build`：通过。
- `npm run test:main-agent-test-agent-ownership`：通过，10 项责任边界全部通过。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `npm run test:main-agent-runtime-e2e`：通过。
- TestAgent `runTestAgentInvocationSelfTest`：通过。
- `npm run test:main-agent-global-real-chain-e2e`：通过；真实 Claude Code 修改文件、运行测试和构建，TestAgent 通过，群聊主 Agent 抽查并总结，全局收到最终结果。
- `npm run test:main-agent-rework-real-chain-e2e`：通过；真实注入首次 TestAgent 失败，群聊主 Agent 将修复交回原项目子 Agent，复用同一个 Claude Code 原生会话，TestAgent 复测通过，主 Agent 抽查通过，任务状态收敛为 `done`，全局 Agent 仅接收并发布最终总结。断言同时确认重复返工被抑制、持久任务存在、项目测试和构建通过。

## TestAgent 模块检查

独立 TestAgent 的调用契约与现有群聊接线兼容：`status=completed` 不能直接视为验收通过，群聊主 Agent 继续以 `canAccept=true` 和 verdict 为通过依据。本轮未发现需要修改 `backend/test-agent/**` 的契约错误，因此没有重复改写另一个 Agent 已完成的 TestAgent 实现。
