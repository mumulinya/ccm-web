# 群聊主 Agent 并行原生会话协作链 v2

## 目标

当一个项目子 Agent 在执行用户根任务时发现跨项目写依赖，例如前端 Agent 需要后端 Agent 新增接口，子 Agent 只向群聊主 Agent 提交协调请求。群聊主 Agent 不打断目标项目正在工作的会话，也不把内部依赖暴露成新的用户任务，而是在同一根任务下创建内部工作项并启动独立第三方 Agent 会话并行处理。

## 完整链路

1. 来源子 Agent 通过内部 `ccm__group_coordinator` MCP 提交实现依赖。
2. 群聊主 Agent 完成目标选择、权限仲裁和正式可写工作项创建。
3. 工作项使用 `queue_scope=isolated_parallel`，拥有独立队列键，不等待目标项目的普通任务队列。
4. 执行内核为工作项创建新的 Claude Code、Cursor、Codex 等原生任务会话。
5. 新会话绑定独立 Git worktree 和分支，与目标项目已有会话并行工作。
6. 子 Agent 返回结构化结果说明、修改文件和已执行验证。
7. 协调专用证据门禁核对结果状态、阻塞、验证、worktree 真实差异以及结果说明和真实差异的一致性。
8. 群聊主 Agent 验收通过后，通过执行内核安全合并 worktree；合并失败时保留分支和证据，不恢复来源 Agent。
9. 合并成功后，系统恢复来源 Agent 原任务级会话，并把依赖结果注入原上下文继续执行。
10. 协调请求、内部工作项、原生会话、worktree、验收、合并和恢复事件都持久化，可在根任务时间线和任务回放中查看。

## 用户展示

用户在群聊中看到的是友好进度，而不是 MCP 协议、session ID 或原始回执：

- `目标成员已在独立会话并行处理`
- `主 Agent 正在验收协作结果`
- `主 Agent 正在安全合并代码`
- `来源成员已解除依赖并继续执行`

原生 session、worktree 路径、分支、代码差异、验证和合并结果放在默认折叠的技术详情与任务回放中。普通问话不会展示这些协作工作项。

## 并发与冲突规则

- 协调工作项默认立即启动独立会话，不受目标项目普通队列阻塞。
- 会话并行必须使用 `child_agent_isolation=worktree`，创建失败时关闭执行，不降级到共享目录。
- 只有真实 worktree 差异和验证证据通过，执行记录才能达到 `merge_ready`。
- 主分支发生变化或 Git 合并冲突时，状态保持为 `merge_conflict`，保留 worktree 供主 Agent 创建定向修复工作项；服务重启不会把它覆盖成普通失败。
- 幂等键、任务租约和协调请求状态共同防止重复执行与重复合并。

## 重启恢复

- 协调请求持久化 `work_item_task_id`。
- 工作项持久化 `coordination_request_id`、来源任务、目标项目、隔离队列和执行模式。
- `resumeTaskQueues()` 启动恢复后会调用 `recoverGroupCoordinationDependencies()`。
- 待执行工作项重新进入独立并行通道；已完成但尚未收口的工作项重新执行验收、幂等合并和来源会话恢复。
- 若服务在“代码已合并、worktree 已清理、来源 Agent 尚未恢复”的窗口重启，系统使用后端持久化的验收证据确认已合并结果，不会因现场已清理而误判失败。
- 若来源 Agent 已完成续跑但协调状态尚未来得及更新，恢复过程只校准状态，不重复启动来源会话。

## 验证

- `npm run check`
- `npm run build`
- `npm run test:group-coordination-mcp`
- `npm run test:group-coordination-chain`
- `npm run test:group-coordination-render`

业务链回归使用真实 Git 仓库和真实 worktree，验证：

- 目标项目已有会话先开始并保持运行。
- 协调会话随后立即并行启动。
- 原会话没有被取消或覆盖。
- 协调 worktree 的代码真实合并回项目。
- 来源 Agent 只在验收和合并成功后恢复。
- 新进程可以重新读取待执行协调请求、工作项关联和隔离队列状态。
- 代码已合并且 worktree 已清理后发生重启，来源 Agent 仍可继续恢复。
- `merge_conflict` 在重启恢复后保持不变，冲突分支和证据不会被自动清理。

截图产物：

- `scratch/group-coordination-render/desktop-group-coordination.png`
- `scratch/group-coordination-render/mobile-group-coordination.png`

## 主要文件

- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/collaboration/group-coordination-store.ts`
- `backend/modules/collaboration/agent-qa-service.ts`
- `frontend/src/components/agents/AgentQaMessage.vue`
- `scripts/group-coordination-business-chain-e2e.mjs`
- `scripts/group-coordination-render-regression.mjs`
