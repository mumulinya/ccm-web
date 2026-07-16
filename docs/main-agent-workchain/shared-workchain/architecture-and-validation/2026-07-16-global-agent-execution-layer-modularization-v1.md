# Global Agent Execution Layer Modularization V1

## Scope

本轮在不修改现有 HTTP API、原入口导出和用户交互行为的前提下，拆分全局 Agent 会话执行层。知识库模块不在本轮范围内，`backend/modules/knowledge/` 和知识库前端页面均保持原结构。

拆分依据是完整业务职责，不以文件行数作为唯一条件。原入口仍是：

- 后端：`backend/modules/global/global-agent.ts`
- 前端：`frontend/src/components/global/GlobalAgent.vue`

## Backend Boundaries

| Module | Responsibility | Compatibility strategy |
| --- | --- | --- |
| `global-agent-history.ts` | Web/飞书会话历史归一化、合并、持久化和会话路由 | 原入口保留历史与飞书路由自测导出，并通过 facade 调用新模块 |
| `global-agent-status.ts` | Mission、监督任务、TestAgent 验收和系统状态的用户可见汇总 | 原入口保留 `isGlobalProgressStatusRequest`、`formatMissionStatus`、`formatSystemStatus` 门面 |
| `global-agent-test-agent-relay.ts` | 把群聊主 Agent 的 TestAgent 计划和独立复核结论投影到全局运行事件 | 原执行链继续调用原函数名；执行所有权仍属于群聊主 Agent |
| `global-agent-direct-dispatch.ts` | 群聊/项目直接派发工作单、单项目 Mission 载荷和“已受理但未完成”摘要 | 原意图判断、派发和自测继续走兼容运行时 |

`global-agent.ts` 从约 7,300 行降到 5,427 行。剩余内容主要是全局意图、飞书通道、agentic runtime、监督启动和 HTTP API 入口；这些职责仍有共享状态，本轮没有继续机械切割。

## Frontend Boundaries

| Module | Responsibility |
| --- | --- |
| `useGlobalMissionTracking.js` | Mission 轮询、终态通知、等待用户补充、定时器释放和任务状态标签 |
| `useGlobalAgentTurnRuntime.js` | 当前 run 包络、执行意图确认、实时事件去重、Todo/TestAgent/确认摘要合并和进度检查点 |

`GlobalAgent.vue` 保留页面协调职责：会话输入、网络请求、任务动作、消息模板和布局。其脚本与模板仍共享较多动作函数和 scoped CSS，因此本轮没有创建参数数量过多的万能消息组件。

## Ownership Guarantees

- 全局 Agent 仍只负责系统入口和把开发需求交给群聊主 Agent。
- 群聊主 Agent 仍负责计划、项目子 Agent 派发、结果验收和 TestAgent 对接。
- TestAgent 复核结果可以上送全局 Agent 展示，但全局 Agent 不直接接管 TestAgent 执行所有权。
- 普通对话不会因为运行时模块化而自动出现 Todo、任务状态卡或技术详情。
- 用户可见摘要与内部技术信息的折叠规则保持不变。

## Verification

- `npm run check`：通过。
- `npm run build:frontend`：通过，Vite 实际转换 2,006 个模块。
- `npm run build:backend`：通过。
- 原入口运行时：历史同步、飞书会话路由、全局意图检查和模型重试均无失败检查项。
- `npm run build`：通过，前端、飞书 MCP 和后端发布产物均已生成。
- `npm run test:render-regression`：通过，共生成 38 张 Playwright 截图；普通问话、任务 Todo、折叠技术详情、Mission 等待/终态、回合补充和子 Agent 摘要均通过。
- 回归 fixture 已补齐 `/api/conversation-turns/*` 内存队列，真实回合控制不再因缺少后端代理而产生假失败。
- 生产页面 `http://127.0.0.1:3083/`：根组件、全局面板和聊天容器均正常挂载，无横向溢出，无控制台错误。

## Maintenance Rules

- 新历史行为进入 `global-agent-history.ts`，不要重新堆回 `global-agent.ts`。
- TestAgent 展示判定进入 `global-agent-test-agent-relay.ts`，真实复核执行仍由群聊链路负责。
- Mission 轮询和终态通知进入 `useGlobalMissionTracking.js`。
- SSE 事件归并和当前 run 状态进入 `useGlobalAgentTurnRuntime.js`。
- 只有当一个候选模块拥有独立生命周期、数据契约或可单独验证的交互边界时才继续拆分。
