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
- 日报和周报先生成不可变 `WorkReportEvidenceSnapshotV3`，绑定报告时区、周期、完整事件ID、任务终态、代码变更、验证、风险、未完成项和checksum。
- 大模型只负责将证据组织为 `WorkReportSummaryV3`；完成事项、验收质量、风险和下一步均必须引用有效工作事件，服务端会按结构化事件类型和状态复核。
- 证据超过模型容量时按完整事件分片总结，再执行结构化合并。任一分片失败、引用失效或最终Token门禁失败时，报告保持 `generation_failed`，不会发送固定模板冒充AI总结。
- 打开自动开发概览只读取已有报告和工作账本，不调用模型、不重写报告。只有手动生成、定时到期或显式刷新才会生成AI总结；相同证据checksum复用已有总结。
- 证据变化后旧总结标记为 `stale`，重新生成成功前不能自动投递。

## 飞书报告投递

- 日报和周报只发送到设置中的固定报告Webhook，不进入全局Agent、项目Agent或群聊会话。
- 正文发送前先创建 `FeishuReportDeliveryV2` 持久发件箱记录，去重身份绑定报告类型、周期、总结checksum和脱敏Webhook指纹。
- 已明确未发送的429、5xx等瞬时失败最多重试5次；超时等无法证明是否到达飞书的结果进入 `delivery_unknown`，不自动重发，避免重复报告。
- 报告卡在发送前验证结构和完整长度，不再用字符截断隐藏风险或下一步。投递状态可跨服务重启恢复并由用户手动重试。

## 调度与时区

- 报告通知单独保存IANA时区，默认 `Asia/Shanghai`。日报日期、周区间、星期与发送时刻均按该时区计算，与服务器所在时区无关。
- 调度tick使用进程内Singleflight和跨进程租约，上一轮未结束时不会重叠扫描；手动发送和定时发送共享报告checksum与发件箱去重。
- 服务启动后恢复过期调度租约、未完成报告生成和待投递记录；无法证明所有权时先释放旧租约，不重复执行副作用。

## 实现入口

- `backend/modules/scheduling/cron.ts`
- `backend/modules/scheduling/cron-job-store.ts`
- `backend/modules/scheduling/work-journal.ts`
- `backend/modules/scheduling/work-report-ai.ts`
- `backend/modules/scheduling/cron-dev-reports.ts`
- `backend/modules/collaboration/feishu-channel.ts`
- `frontend/src/components/tools/CronJobs.vue`
- `frontend/src/components/tools/AutoDevOps.vue`
