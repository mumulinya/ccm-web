# 飞书生产工作链路 v1

日期：2026-07-13  
状态：已实现并完成真实运行验收

## 目标

让飞书成为 CCM 主 Agent 工作链路的生产入口和进度出口：用户从飞书发出需求后，由全局 Agent 负责识别与路由，群聊主 Agent 负责计划、项目子 Agent 派发、验收和 TestAgent 调用，最终结果和关键过程回到原飞书会话。

## 责任链

```text
飞书用户
  -> cc-connect 飞书 WebSocket
  -> CCM Global Agent ACP
  -> 全局 Agent（识别、路由、持久监督）
  -> 群聊主 Agent（计划、派发、验收）
  -> 项目子 Agent（实现并返回变更/验证证据）
  -> 群聊主 Agent（验收）
  -> TestAgent（独立测试）
  -> 群聊主 Agent（返工/复验/最终总结）
  -> 原飞书会话
```

全局 Agent 不直接取代群聊主 Agent 调用 TestAgent。TestAgent 的执行和验收所有权仍属于群聊主 Agent，全局 Agent只负责派发和转达监督状态。

## 已实现

### 原会话定向投递

- 从 cc-connect 的 `ccm-control-bot_*.json` 会话文件解析 `feishu:<chat_id>:<open_id>`。
- 将 ACP session、global run、mission 和 group task 持久绑定到原始飞书目标。
- 优先使用飞书 IM API 向原 `chat_id` 发送交互卡片；没有绑定时才回退固定 Webhook。
- 已绑定任务不会再由旧任务完成/失败逻辑重复发送固定 Webhook。

### 用户可见阶段

- 复杂任务计划已整理。
- 任务开始派发、派发完成。
- 项目任务开始执行、等待补充、完成、失败或取消。
- TestAgent 复核计划、TestAgent 验证结论。
- 验收缺口、返工、运行恢复、依赖释放。
- 等待用户补充、最终完成总结、终止结果。

普通问话不映射为计划或 Todo 通知。只有 `plan_mode_ready` 等明确任务事件才产生计划卡片，内部回执、密钥和本机路径会在用户可见内容中收起或脱敏。

### 可靠投递

- 状态文件：`C:\Users\admin\.cc-connect\feishu-channel-state.json`。
- 保存会话绑定、任务阶段投递、日报周报投递和收发健康摘要。
- 阶段投递使用 `dedupe_key` 幂等；每条 delivery 还使用原子锁文件取得跨进程发送租约，防止服务 Cron 和外部验收进程同时发送同一记录。失败进入 outbox，指数退避，最多尝试 5 次。
- Cron 每轮处理到期 outbox，服务重启后可继续。
- 日报和周报保留原有独立重试，默认最多 3 次、间隔 10 分钟，并同步写入通道报告审计。

### 日报周报

- 日报已启用：每天 `18:30`。
- 周报已启用：每周五 `18:40`。
- 两类报告由固定飞书 Webhook 投递，历史发送记录和最新结果持久化。

### 安全与边界

- `GET /api/feishu/config` 对 Webhook、Secret、签名密钥等只返回 `******`，不返回完整凭据。
- 前端提交 `******` 时保留原凭据，不会用占位符覆盖真实值。
- 定向卡片会过滤常见 Token、Secret、内部 Agent 回执和本机用户路径。
- ACP 明确声明 `image=false`、`audio=false`。收到非文本附件时会友好说明当前不能可靠读取，并且不会把附件标记为已读取或已验收。

## 运维接口

- `GET /api/feishu/health`：进程、WebSocket、收发、outbox、报告开关快照。
- `POST /api/feishu/health/probe`：真实获取 tenant token 并调用飞书 Bot Info API。
- `GET|POST /api/feishu/channel/self-test`：纯逻辑契约自测。
- `GET /api/feishu/channel/deliveries`：脱敏后的阶段和报告投递记录。
- `POST /api/feishu/channel/outbox/retry`：立即处理已到重试时间的通知。

设置页现在显示真实通道状态，包括 WebSocket 是否连接和待重试数量；“验证连接”会运行真实 API 探针。

## 自动化验收

专项命令：

```powershell
npm run test:feishu-channel
```

覆盖：原会话解析、持久绑定、阶段映射、TestAgent 所有权、重复 Webhook 抑制、配置脱敏、真实健康接口、日报周报调度与审计、附件边界和文本脱敏。

本次通过：

- `npm run check`
- `npm run build`
- `npm run test:feishu-channel`
- `npm run test:main-agent-test-agent-ownership`
- 运行中 `/api/feishu/channel/self-test`：通过
- 运行中 `/api/feishu/health/probe`：`healthy=true`，飞书 API 探针成功
- 控制机器人最新进程：PID `20244`，WebSocket 已连接
- 设置页真实渲染：通道在线、WebSocket 已连接、待重试 0 条、无控制台错误

## 真实投递证据

2026-07-13 向历史 cc-connect 会话对应的原飞书会话执行了真实定向发送验收：

- 标题：`CCM 飞书通道验收`
- 状态：`sent`
- 飞书返回成功并生成真实 `message_id`
- outbox：无待重试、无耗尽投递

首次真实验收同时暴露了一个跨进程竞争：验收进程和服务 Cron 在两秒内同时认领了同一条 pending delivery，产生了两次成功发送。该问题未被掩盖；随后增加了基于 `open(..., "wx")` 的原子 delivery 租约，并加入 `cross_process_delivery_lease` 回归项。修复后的运行中自测通过，竞争认领会被拒绝，且没有再发送新的测试卡片。历史 delivery 保留 `attempts=2`，用于审计这次发现过程。

历史日志已证明飞书用户消息可经 WebSocket 和 ACP 进入全局 Agent；本次验收进一步证明最新代码能从持久会话反查原目标，并通过飞书 IM API 定向返回卡片。真实用户下一次从飞书发出的任务会自动建立新的 inbound 与任务绑定记录。

## 明确限制

- 当前附件只做边界提示，尚未下载、解析或交给 Agent；这避免把未读取附件误当作验收证据。
- 日报周报使用固定 Webhook；任务阶段使用原会话 IM API，两者目的和目标范围不同。
- 飞书开放平台的应用权限、机器人入群范围和企业侧策略仍由飞书管理；健康探针可验证当前凭据和机器人 API 是否可用。
