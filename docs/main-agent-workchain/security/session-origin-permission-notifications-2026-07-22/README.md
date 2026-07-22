# 精确来源会话审批与通知

Date: 2026-07-22

## 交付范围

本次升级把用户权限审批放回真实发起位置，并保留任务派发页作为统一审批中心：

- 全局 Agent 任务绑定并显示在精确全局会话。
- 群聊项目任务绑定并显示在精确 `gcs_*` 会话。
- 独立项目 Agent 权限绑定并显示在精确项目会话，不伪造任务 ID。
- 独立项目批准后在同一项目会话继续原任务；群聊与全局任务批准后由任务队列恢复。
- 宠物运行时可用时播报权限提醒；飞书优先通知来源绑定，未绑定时使用已配置报告通道。

## 安全边界

- 所有会话页面查询都携带 `originType + originSessionId`，群聊再绑定 `originGroupId`，项目再绑定 `originProject`。
- 授权默认 15 分钟、一次使用，并绑定项目、任务或项目会话、子 Agent 会话、Provider native session 与操作 checksum。
- 绑定命令只能通过 CCM 受控运行器执行；批准卡不会直接放宽第三方 CLI 的全部权限。
- 宠物与飞书分别持久化发送状态；某一路失败重试时不会重复另一条已成功通知。

## 主要文件

- `backend/modules/collaboration/task-permission-broker.ts`
- `backend/modules/collaboration/task-permission-routes.ts`
- `backend/integrations/permission-broker-mcp.ts`
- `ccm-package/mcp-permission-broker/internal-mcp.json`
- `frontend/src/components/common/PermissionApprovalCards.vue`
- `frontend/src/composables/usePermissionApprovals.js`
- `frontend/src/components/global/GlobalAgent.vue`
- `frontend/src/components/collaboration/GroupChatPanel.vue`
- `frontend/src/components/projects/ProjectManagerPanel.vue`

## 验证证据

- `npm run check`：通过。
- `npm run build:frontend`：通过。
- `npm run test:task-permission-broker`：17 项通过，付费 Provider 调用为 0。
- `npm run test:session-permission-approval-ui`：5 项通过。
- `npm run test:internal-mcp-catalog`：内置 MCP 8 个、工具 42 个。
- `npm run test:third-party-memory-mcp-hydration`：49 项通过，权限 MCP 未破坏第三方 Agent 的会话记忆读取，付费 Provider 调用为 0。
