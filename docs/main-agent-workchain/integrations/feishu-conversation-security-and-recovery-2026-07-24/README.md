# 飞书精确会话、交互审批与投递恢复

Date: 2026-07-24

Status: Implemented

## 目标

飞书任务通道使用精确来源会话、原消息回复、单任务状态卡、交互审批、用户角色和可恢复 outbox。网页会话回复不会自动回发飞书，日报周报继续使用独立固定 Webhook。

## 当前业务流程

```text
飞书消息 / 图片 / 附件
  -> WebSocket ACP 或事件回调
  -> Token、加密事件、message_id 幂等校验
  -> chat_id + open_id（或 ACP native session）生成独立 feishu:* 会话
  -> 用户角色校验
  -> 全局主 Agent 模型判断问答、分析、执行、计划或 Epic
  -> run / mission / task 与来源飞书会话和原 message_id 持久绑定
  -> 普通回答回复原消息
  -> 同一任务的计划、执行、TestAgent、返工和完成阶段更新同一张任务卡
  -> 发送失败进入 outbox，最多自动重试五次
  -> 耗尽后通过统一 SSE 和桌面宠物提醒，设置页允许精确手动重试
```

## 会话与回复边界

- 飞书会话不再继承当前或最近 Web 全局会话的 transcript。
- 直接飞书事件以 `chat_id + open_id` 建立会话；ACP 通道缺少平台字段时以其 native session 建立独立会话。
- 入站 `message_id`、`root_id` 和 `thread_id` 保存在来源绑定中。
- 普通回复和新任务卡优先调用飞书 Reply API；话题消息设置线程回复。
- 同一任务后续阶段调用消息 PATCH API更新已有卡片，不连续创建阶段通知。

## 权限卡片

- 权限申请包含“批准一次”和“拒绝”按钮。
- 按钮值绑定申请 ID、来源 binding、决定、过期时间和 HMAC 签名。
- 回调校验签名、过期时间、消息卡片绑定、任务归属和用户角色。
- 全局、群聊和项目来源均可通过有效卡片审批；文字命令继续兼容全局来源。
- 批准仍只创建一次、15 分钟有效的精确权限租约，飞书按钮不会扩大操作范围。

## 用户角色

- `viewer`：普通问答、只读分析和状态查看。
- `operator`：创建、排队、引导和停止任务，不允许审批权限。
- `admin`：包含权限审批。
- `open` 模式允许所有可识别用户并按操作员处理；`mapped` 模式只允许设置页名单。OAuth 授权用户作为管理员兼容入口。
- 查看者是否要求执行由统一工作流模型判断，不使用关键词或正则进行业务意图分类。

## 投递恢复

- 每条投递有幂等键、跨进程租约、状态、尝试次数、发送模式和脱敏错误。
- 发送失败使用指数退避，最多五次；服务重启后继续处理。
- 耗尽后发布 `feishu.delivery_exhausted`，Web 全局监听显示错误提示，桌面宠物同步提醒。
- 设置页展示待重试、已耗尽、已发送和最近二十条投递，可对精确失败记录手动重试。

## 兼容性

- `/api/feishu/control-bot/message`、`/api/feishu/bot/event` 和旧任务通知调用保持兼容。
- 没有原消息 ID 的历史绑定继续向原 `chat_id/open_id` 新发消息。
- 固定 Webhook 只用于日报周报和没有来源绑定时的旧降级路径。
- 旧 `feishu-channel-state.json` 读取时补充 `cards` 与 `identities`，不批量迁移或删除历史投递。

## 验证

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/feishu-channel-production-selftest.mjs`
- `node scripts/feishu-control-bot-reliability-selftest.mjs`
- `node scripts/feishu-global-agent-roundtrip-selftest.mjs`
- `node scripts/feishu-conversation-security-selftest.mjs`
- 测试 Provider 付费调用：0

## 主要文件

- `backend/modules/collaboration/feishu-access.ts`
- `backend/modules/collaboration/feishu.ts`
- `backend/modules/collaboration/feishu-channel.ts`
- `backend/modules/collaboration/task-permission-broker.ts`
- `backend/modules/global/global-agent-feishu-channel.ts`
- `backend/modules/global/global-agent-history.ts`
- `frontend/src/components/settings/SettingsFeishuPanel.vue`

