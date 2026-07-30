# 定时任务与AI日报周报完整链路

## 用户入口

- 用户在“定时任务”页面创建、启停、手动执行、重试或归档精确项目/群聊任务。
- 用户在“自动开发”页面查看工作证据、手动生成日报或周报、配置报告时区与固定飞书Webhook，并查看生成和投递状态。
- 定时任务到期、任务进入终态和TestAgent完成验收时，系统把结构化事实追加到工作事件账本；页面不会自行拼造完成情况。

## 完整业务流程

```text
定时任务与任务终态
→ 不可变工作事件账本
→ 指定时区的日报/周报证据快照
→ 大模型结构化总结
→ 服务端来源与状态校验
→ 持久飞书报告发件箱
→ 去重、超时、重试或人工确认
→ 页面状态、审计与重启恢复
```

1. 调度器按任务Cron和IANA时区判断是否到期，并为精确项目或群聊创建持久运行记录。
2. 定时运行进入现有统一任务系统与精确会话队列，不创建第二套开发任务；源码修改仍经过主Agent、项目子Agent、TestAgent或主Agent自验以及最终验收。
3. 任务、文件变更、验证、阻塞、失败、用户操作和系统动作以不可变事件写入工作日志。重复事件按稳定身份去重，历史事实不因报告重生成而改写。
4. 生成报告时，服务端按配置时区确定日报日期或周范围，收集周期内全部事件，建立 `WorkReportEvidenceSnapshotV3` 并计算checksum。
5. 若同一证据checksum已有通过校验的AI总结，直接复用，不再次调用模型。打开页面只读取当前证据和保存的报告，不隐式产生费用。
6. 模型输出概览、完成事项、重点进展、验收质量、风险和下一步，并为每一项返回事件ID。超大周期按完整事件记录分片，全部分片成功后才合并。
7. 服务端核验事件存在且属于当前快照，并限制不同栏目可引用的结构化事实。模型不能把普通文本猜成已完成、已验收或风险结论。
8. 校验成功后保存正式AI总结、生成回执、Token与checksum；证据变化会将旧总结标记为过期，重新生成成功前不替换展示版本，也不自动发送。
9. 自动或手动发送先创建 `FeishuReportDeliveryV2` 发件箱记录。相同报告类型、周期、总结checksum和Webhook指纹只允许一个有效投递。
10. 飞书明确拒绝或服务端失败时最多重试5次；网络超时等无法证明是否送达时标记“投递未知”，停止自动重发，由用户查看审计后决定是否手动重试。
11. 服务重启后恢复调度租约、报告生成状态和未完成发件箱；已证明完成的模型总结和投递不会重复执行。

## 报告状态

- `evidence_ready`：证据已收集，尚未生成AI总结。
- `generating`：模型正在基于当前checksum生成总结。
- `generated`：总结和引用均通过服务端校验，可发送。
- `stale`：证据已变化，旧总结仅供查看，不能自动发送。
- `generation_failed`：模型、分片、Token或证据校验失败；保留原始证据，禁止模板降级发送。
- `pending/sending`：持久发件箱等待或正在投递。
- `sent`：飞书返回明确成功。
- `delivery_unknown`：请求结果不确定，禁止自动重发。
- `failed`：明确失败且重试耗尽，可从投递记录手动重试。

## 数据与边界

- 工作事件账本、V2历史报告和历史飞书审计继续保留；V3只增加证据快照、AI展示层和投递回执。
- Prompt、API Key、Webhook原文和业务正文不会写入能力状态或普通日志；Webhook仅保存脱敏指纹。
- 报告通道与Agent双向会话严格分离。报告不能降级发送到全局Agent、项目Agent、群聊或其他Webhook。
- 模型只负责语义总结，任务终态、文件、验证和TestAgent结论始终由结构化事件决定。
- 报告卡必须完整通过长度和结构校验；不允许 `.slice()` 字符截断后发送残缺报告。

## 失败与恢复

- Provider未配置、鉴权失败、超时、重试耗尽、熔断、无效JSON或虚构证据都会使生成失败，且不会发送旧模板。
- 调度tick由进程内Singleflight和跨进程租约保护；重叠tick、手动发送和自动发送不会重复生成或重复投递。
- 可证明未送达的瞬时投递错误最多重试5次；不确定结果等待人工处理，避免飞书实际成功后再次发送。
- 失败报告仍可在页面查看完整证据、失败原因和重试状态，原始工作事件不丢失。

## 实现与验证

- AI证据与总结：`backend/modules/scheduling/work-report-ai.ts`
- 报告生命周期：`backend/modules/scheduling/cron-dev-reports.ts`
- 时区与调度：`backend/modules/scheduling/cron.ts`、`backend/modules/scheduling/cron-job-store.ts`
- 工作事件账本：`backend/modules/scheduling/work-journal.ts`
- 飞书发件箱：`backend/modules/collaboration/feishu-channel.ts`
- 页面：`frontend/src/components/tools/AutoDevOpsPanel.vue`、`frontend/src/components/tools/useAutoDevOps.js`
- 自动化回归：`scripts/work-report-ai-production-selftest.mjs`、`scripts/work-journal-selftest.mjs`、`scripts/auto-dev-selftest.mjs`、`scripts/feishu-channel-production-selftest.mjs`

专项回归使用Mock模型，付费Provider调用为0；生产构建与文档链接检查属于发布门禁。
