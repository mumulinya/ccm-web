# 定时开发与工作报告

## 定时任务

- 定时任务目标为精确项目或群聊，不直接创建另一套执行系统。
- 每个任务保存 Cron 表达式、时区、提示词、优先级、附件快照、重试策略、错过执行策略和通知条件。
- 默认时区为 `Asia/Shanghai`，Cron在保存时校验，并计算下一次运行时间。
- 支持启用、停用、手动执行、重试、恢复、取消、归档、恢复归档和永久删除。

## 执行链

1. 调度器按分钟匹配 Cron 和时区，创建持久运行记录。
2. 运行转换为统一项目或群聊任务，进入相应精确队列。
3. 群聊 `daily_dev` 可导入共享文档和需求池，按批次认领待办。
4. 代码开发仍经过主 Agent规划、项目子 Agent、TestAgent/自验和终态门禁。
5. 运行历史跟随真实任务状态；失败、等待、恢复和完成可按配置通知。

## 恢复规则

- 服务启动会核对未完成运行；失效执行按 `run_once` 或 `skip` 策略处理。
- 重试有次数和间隔上限，不会无限循环。
- 失败或等待用户的运行释放当前执行权，不阻塞其他精确队列。

## 工作日志与报告

- 工作日志从任务、项目会话、TestAgent和系统事件投影，不让前端手工拼造完成情况。
- 日报和周报包含目标、完成项、验证、风险和未完成事项，并保留证据引用。
- 报告可手动生成，也可由定时任务生成和通知。

## 实现入口

- `backend/modules/scheduling/cron.ts`
- `backend/modules/scheduling/cron-job-store.ts`
- `backend/modules/scheduling/work-journal.ts`
- `frontend/src/components/tools/CronJobs.vue`
- `frontend/src/components/tools/AutoDevOps.vue`
