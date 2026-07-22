# 群聊主 Agent 分级权限审批

Date: 2026-07-22

## 本次实现

- 新增持久化权限请求账本和精确授权租约。
- 新增独立内置 MCP `ccm__permission_broker`，提供 `request_execution_permission`、`consume_execution_permission` 与 `execute_approved_command`。
- 确定性分类先拦截发布、生产部署、强推、密钥、系统提权、越界路径和破坏性数据库操作。
- 中风险请求由群聊主 Agent 的统一模型返回 `approve | user | reject`；模型失败时 fail closed 到用户。
- 全局、群聊和项目页面按精确来源会话加载权限申请；任务派发页继续作为统一审批中心。
- 待用户审批时通知可用宠物与飞书，分别记录发送状态并进行有限重试。
- 用户批准后自动将任务恢复为待执行并重新入队。
- 审批、拒绝、消费和过期均写入任务时间线；租约只允许绑定的任务 Agent 消费。
- 绑定命令由 CCM 受控运行器执行，使用限制环境变量并自动消费租约；Codex 在 Windows 上的默认 sandbox 已从全盘权限收紧为 `workspace-write`。
- 群聊主 Agent 的派单 JSON 增加 `permissionPlan`，提前区分主 Agent 可审批事项和用户必须审批事项。

## 主要文件

- `backend/modules/collaboration/task-permission-broker.ts`
- `backend/modules/collaboration/task-permission-routes.ts`
- `backend/integrations/permission-broker-mcp.ts`
- `backend/modules/collaboration/group-orchestrator-llm.ts`
- `frontend/src/components/common/PermissionApprovalCards.vue`
- `frontend/src/composables/usePermissionApprovals.js`
- `frontend/src/components/global/GlobalAgent.vue`
- `frontend/src/components/collaboration/GroupChatPanel.vue`
- `frontend/src/components/projects/ProjectManagerPanel.vue`
- `frontend/src/components/tasks/TaskListItem.vue`
- `frontend/src/components/tasks/useTaskManager.js`

## 验证

- `npm run check`：通过。
- `npm run test:task-permission-broker`：17 项通过。
- `npm run test:session-permission-approval-ui`：5 项通过。
- 覆盖项目内策略批准、群聊主 Agent mock 模型审批、硬风险升级用户、全局/群聊/项目精确来源会话、用户限时授权、Provider generation 隔离、宠物/飞书通知去重和越界路径。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- 测试全部使用本地 mock Provider，付费调用为 0。

## 已知执行边界

CCM 能强制约束自身任务包、MCP 工具、运行器环境、工作区和授权租约。第三方 Agent CLI 内部若绕开 CCM MCP 直接执行命令，仍需依赖该 CLI 自身的 sandbox/approval 模式；CCM 会通过派发提示、运行时配置和交付审计要求其遵守，但不能伪造第三方 Provider 内部不存在的命令级拦截能力。
