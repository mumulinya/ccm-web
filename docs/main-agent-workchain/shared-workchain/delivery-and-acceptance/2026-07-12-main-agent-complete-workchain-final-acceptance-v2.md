# 主 Agent 完整工作链最终验收 v2

## 结论

群聊主 Agent 与全局主 Agent 已按最初目标完成重新严格检验。最终验收不是只看源码或 fixture，而是同时使用隔离生产服务、真实第三方 Claude Code、真实 TestAgent、主 Agent 抽查、任务持久化、服务重启和 Playwright 生产组件截图。

## 真实链证据

### 群聊成功链

- 任务：`mrhgr0tx7a16`
- Trace：`group_mrhgr0rh_c8e46bf6f2a7`
- Claude Code 实际把 `src/feature.js` 的 `deliveryMarker` 改为 `group-real-chain-1783840781769`
- 项目 `npm test` 与 `npm run build` 通过
- TestAgent 独立复核通过
- 主 Agent 完成前抽查通过
- 用户可读最终总结已发布
- 群消息接口载荷约 11.4 MB，低于 25 MB 门限

### 全局失败返工链

- run：`gar_mrhglxad_80af003c`
- 任务：`mrhgmk9qqzwc`
- Trace：`global-agent-request_mrhglx9l_55a9906c2390`
- Claude Code 首轮完成 `deliveryMarker` 修改
- TestAgent 首轮按注入条件真实失败并要求返工
- 监督器只生成一条返工 followup，并恢复同一个 Claude Code native session
- 同一个 task session `turnCount=2`
- 原 Agent 新增精确 `reviewRepairMarker`
- TestAgent 复验通过，主 Agent 抽查通过
- 重复全局 `request_id` 回放同一个 run
- 最终任务 `done`，run 与 supervision 均完成，用户总结已发布

### 断线与重启链

- 任务：`mrhguv7l51eu`
- Trace：`group_mrhguuxq_b536c463719c`
- 收到 `task_created` 后主动断开 SSE
- 执行开始后停止并重启生产服务
- 使用相同 `client_message_id` 重发
- 重启前后任务 ID 与 Trace 不变，持久任务总数仍为 1
- Claude Code、TestAgent、主 Agent 抽查和最终总结在恢复后全部完成

## 普通问话与用户展示

`scripts/main-agent-runtime-e2e.mjs` 在隔离生产服务中发送普通问话并验证：

- 全局生产 UI mapper 返回纯文本，不生成 Todo 卡、mission、plan mode 或 delivery report。
- 群聊不发送 `task_created`。
- 两次问话前后任务存储均为 0。
- 主文本不包含内部协议、Trace 或 native session 字段。

Playwright 使用生产 Vue 组件和生产样式，36 张截图全部通过。核心证据：

- `scratch/render-regression/01-simple-conversation-no-todo.png`
- `scratch/render-regression/02-task-plan-visible.png`
- `scratch/render-regression/03-technical-details-folded.png`
- `scratch/render-regression/09-child-agent-summary-expanded.png`

技术详情默认折叠；执行成员摘要默认收起，点击后可以展开；普通问话没有 Todo，真实任务显示当前计划与实时状态。

## 验收中发现并修复的问题

- 群消息接口返回体过大，已接入运行时压缩并设置真实载荷门限。
- 全局单项目派发改为持久任务和 mission supervisor，不把“已派发”当完成。
- TestAgent 失败返工复用原第三方 Agent 原生会话。
- direct-review 幂等键按 TestAgent 真实失败轮次递增，同一失败的监督轮询不会重复返工。
- TestAgent 最新失败命令与缺口会进入返工工作单。
- 单项目 `contractChanges` 不再错误要求注入给当前项目自身；多 Agent 契约同步仍保留。
- 全局模型网络、429 和 5xx 具备有限重试；模型不可用时保守停止写操作，不用关键词规则伪造派发。

## 最终验证

- `npm run check`：通过
- `npm run build:backend`：通过
- `npm run build:frontend`：通过
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过
- `npm run test:main-agent-runtime-e2e`：通过
- `npm run test:render-regression`：通过，36 张截图
- `npm run test:main-agent-real-chain-e2e`：通过
- `npm run test:main-agent-global-real-chain-e2e`：通过
- `npm run test:main-agent-rework-real-chain-e2e`：通过
- `npm run test:main-agent-resilience-real-chain-e2e`：通过
- `runDirectProjectReviewContinuationSelfTest()`：通过
- `runContractTransferPlanSelfTest()`：通过
- `runCoordinatorReworkProtocolSelfTest()`：通过
- `runGlobalAgentLoopSelfTest()`：通过
- `runGlobalMissionSupervisorAsyncSelfTest()`：通过
- `git diff --check`：通过，仅有工作区既有换行提示

## 边界

- 未修改 `backend/test-agent/**`。
- TestAgent 内部业务仍由独立维护链负责；主 Agent 只负责工作单连接、结果消费、返工调度、抽查、用户展示和最终完成门禁。
- 本轮按用户要求暂未提交代码。
