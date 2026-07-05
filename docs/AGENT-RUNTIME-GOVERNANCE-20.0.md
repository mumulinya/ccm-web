# Agent 运行治理中心 20.0

目标：让用户能清楚看到“哪个 Agent 正在跑、能不能停、停止后会怎样”，并避免服务启动或健康检查把历史任务悄悄续跑起来。

## 本轮完成

1. 活跃 Agent Run 注册表
   - 底层执行内核记录当前活跃 run：run id、task id、execution id、项目、执行器、PID、工作目录、开始时间、超时和来源。
   - 覆盖普通项目 Agent、群聊子 Agent、项目聊天流式 Agent。

2. 运行治理 API
   - `GET /api/agent-runs`：查看当前正在运行的底层 Agent。
   - `POST /api/agent-runs/cancel`：按 run id 或 task id 发送停止请求，尝试终止底层 CLI 进程，并写入任务取消请求。

3. 启动恢复改为保守模式
   - 默认不再把服务启动时发现的历史 pending / in_progress 自动入队执行。
   - 默认进入“手动恢复模式”：暂停任务、标记 `recovery_pending`，等待用户确认。
   - 如确实需要旧行为，可设置 `CCM_AUTO_STARTUP_TASK_RECOVERY=true`。

4. 任务看门狗改为手动恢复优先
   - 定时看门狗默认只监控并提示，不自动恢复、重试或返工。
   - 用户点击“恢复自动任务”时才调用真实恢复逻辑。
   - 如确实需要后台自动恢复，可设置 `CCM_AUTO_TASK_WATCHDOG_RECOVERY=true`。

5. 运行债务清理
   - `POST /api/tasks/runtime-debt/cleanup`
   - 支持 `dry_run` 预览。
   - 默认安全清理：暂停无租约旧任务、释放租约、移出队列、转入人工处理；不删除任务数据。

6. 任务管理页运行治理卡
   - 展示当前运行中的 Agent CLI、PID、执行器、来源、耗时、标题。
   - 支持停止单个运行。
   - 支持预览/清理运行债务。

## 当前边界

- 进程停止依赖当前服务进程持有的 child handle；服务重启前的孤儿外部进程只能通过 PID/系统进程管理进一步增强。
- 外部 Agent Runner 请求已支持取消标记，但 Runner 侧是否能即时杀掉底层 CLI 取决于 Runner 实现。
- 本轮默认选择“保守控制”，减少后台自动行为；需要自动恢复的场景通过环境变量显式开启。

## 后续建议

1. 增加孤儿 CLI 进程扫描：识别没有 active run 绑定的 `claude/codex/cursor-agent`。
2. 给运行治理卡加按任务/项目筛选。
3. 停止 run 后，在任务卡内展示“停止原因”和“一键继续”。
4. 将 token / 运行耗时 / 执行器失败次数纳入质量中心。
