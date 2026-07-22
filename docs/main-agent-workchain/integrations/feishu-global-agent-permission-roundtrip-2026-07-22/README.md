# 飞书全局 Agent 与权限审批闭环

Date: 2026-07-22

## 业务流程

```text
飞书用户发送文字、图片或附件
  -> 控制机器人校验事件并解析来源 chat/open_id
  -> 创建或复用该飞书来源对应的单个全局 Agent 会话
  -> 用户消息写入该全局会话 transcript
  -> 全局 Agent 识别意图并回答、管理系统或下发业务开发任务
  -> run / mission / task 与原飞书会话建立持久绑定
  -> 普通回复、执行进度、排队提示、错误和最终结果优先返回原飞书会话
  -> 项目子 Agent 需要用户权限时，权限申请返回原飞书会话
  -> 用户回复“批准权限 perm_xxx”或“拒绝权限 perm_xxx”
  -> 校验申请属于当前精确全局会话
  -> 生成单次限时租约并恢复原任务，或记录拒绝
```

## 关键约束

- 每个飞书来源会话映射到独立全局 Agent 会话，不共享其他飞书会话 transcript。
- 出站消息先使用 `sessionId/runId/missionId/taskId` 查找原飞书绑定；只有不存在绑定时才降级到已配置的通用报告通道。
- 原飞书通道发送失败但已进入 outbox 时只由 outbox 重试，不再额外发送通用 webhook，避免重复消息。
- 权限批准必须匹配 `originType=global`、当前全局会话 ID、申请 ID 和 `awaiting_user` 状态。
- 权限租约仍绑定任务、项目、子 Agent 会话、Provider native session 和操作 checksum，飞书只提供用户决策入口，不扩大权限。

## 主要文件

- `backend/modules/global/global-agent-feishu-channel.ts`
- `backend/modules/global/global-agent-api.ts`
- `backend/modules/global/global-agent.ts`
- `backend/modules/collaboration/feishu-channel.ts`
- `backend/modules/collaboration/task-permission-broker.ts`
- `scripts/feishu-global-agent-roundtrip-selftest.mjs`

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run test:feishu-global-agent-roundtrip`：4 项通过，付费 Provider 调用 0。
- 覆盖原会话权限批准、原会话回复、兄弟会话拒绝和运行中排队提示回传。
- `node scripts/feishu-channel-production-selftest.mjs`：生产通道 11 项通过。
- `node scripts/feishu-control-bot-reliability-selftest.mjs`：可靠性 7 项通过。
- `node scripts/conversation-turn-control-selftest.mjs`：持久队列、幂等、停止和重试通过。
