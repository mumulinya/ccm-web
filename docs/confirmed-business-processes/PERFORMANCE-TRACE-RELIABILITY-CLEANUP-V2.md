# 性能监控、Trace、可靠性与清理中心完整链路V2

## 业务目标

```text
Agent、任务、工具与系统运行
→ 结构化事件
→ SQLite可靠性账本与指标
→ 脱敏Trace、任务回放和性能聚合
→ 异步可靠性演练
→ 清理预览与持久事务
→ 审计、恢复和页面反馈
```

这条链只记录可证明的运行事实。成功、失败、取消和阻塞来自结构化终态，不从回复或错误文本猜测。Trace不保存Prompt、API Key、Cookie、环境变量、图片base64或无限长工具结果；原始事实继续留在任务、会话、执行账本和证据仓库。

## 可靠性账本与Trace

1. 每次幂等操作以`scope + key checksum`在SQLite事务中认领；并发进程只能得到一个执行权。
2. 任务租约保存`lease_id`、递增`fencing_token`、实例、PID和到期时间。续租、释放及结果提交必须同时匹配租约和fencing token。
3. 进程退出不会让竞争者在租约有效期内直接抢占。启动恢复器只处理已过期或明确失效的所有权，无法证明时进入`blocked/ownership_unproven`。
4. Trace事件按稳定事件ID去重，并在事务中取得trace内单调序号。多进程追加不会通过JSON数组读改写覆盖兄弟事件。
5. `TraceSanitizerV2`递归限制对象深度、数组数量、字段长度和单事件Token。技术结果只保存摘要、checksum、状态、耗时、Token和受控证据引用。
6. 旧JSON Trace和账本只读兼容；读取时生成脱敏投影，新事件全部写入V2表。

Trace和可靠性诊断仅Admin可见。旧带副作用的GET自测返回`410 diagnostic_endpoint_moved`；正式诊断使用带CSRF的`POST /api/reliability/diagnostics/run`。

## 性能监控V3

- `metric_events_v3`按全局、群聊和项目作用域保存事件，并为时间、状态和任务建立索引。
- 聚合与事件去重在同一SQLite事务完成，稳定`event_id`防止终态回调重复统计。
- 性能概览只返回聚合和作用域目录；执行明细由`GET /api/metrics/events`按游标、状态、角色、时区和日期分页读取。
- 页面可在全局、群聊和项目间切换。项目统计区分项目主Agent、开发Agent和TestAgent。
- 终态只接受`completed | failed | cancelled | blocked`；旧数据无法证明时显示`unknown/历史状态无法证明`。
- 日期边界按配置时区计算，默认`Asia/Shanghai`。失败、阻塞和取消事件同样保留发生时间与真实耗时。
- 事件明细默认保留180天，日聚合保留两年，终态审计摘要长期保留。指标重置只能由Admin从清理中心生成预览后执行。

Viewer可查看脱敏聚合，Operator可查看执行明细，Trace、诊断、指标重置和清理只允许Admin。

## 任务回放

- 完整回放事件按根任务和来源checksum物化到SQLite，单页读取不再每次重建全部事件图。
- checksum覆盖任务时间线、日志、全局Run、Supervisor、TestAgent产物、Trace游标、子Agent执行、原生会话和回放日志；任一来源变化都会生成新物化版本。
- 页面所有任务切换、历史分页和实时刷新都绑定`AbortController + request_generation`。旧请求及其`finally`不能覆盖当前任务。
- 实时更新只合并当前精确任务的新事件；历史页不会覆盖最新摘要、终态或验收结果。
- 普通用户默认看到用户化进度；Provider、session、generation、Trace和内部状态仍位于二次展开的排障信息。

## 可靠性演练

1. Admin调用`POST /api/reliability/drills/run`只创建持久运行并返回`run_id`。
2. 调度器通过任务租约实现跨进程Singleflight，定时、手动和启动恢复不能并发执行同一类演练。
3. Git、工作树和测试演练在受管Node子进程中运行，具备AbortSignal、20分钟上限、输出限制和完整进程树终止。
4. 运行阶段、checkpoint、结果、失败分类、stderr摘要和取消状态保存到SQLite。
5. 服务重启后恢复可证明的运行；无法证明的残留进程和工作树被安全终止或标记阻塞，不在主HTTP线程同步补跑。
6. 页面通过状态查询和SSE展示真实阶段，可取消未终态演练。自动演练只在系统空闲且没有同类运行时启动。

## 清理事务V2

```text
后台存储索引
→ Admin选择清理动作
→ 生成10分钟预览和候选指纹
→ 输入永久删除确认短语
→ 再次核验数据未漂移
→ 创建CleanupTransactionV2
→ 逐项幂等执行
→ completed | partial | failed | cancelled
→ 分页审计与后台重新扫描
```

- `GET /api/cleanup/summary`只读最近成功的`StorageIndexSnapshotV2`，不在页面打开时递归扫描或修改附件注册表。
- 存储扫描异步、受限并发，使用`lstat/realpath`阻止符号链接和Junction越界；首次显示`index_building`，失败保留上一份可用快照和降级原因。
- 预览保存精确候选ID、版本指纹、checksum和有效期。执行时对象已变化返回`409 state_drift`。
- 永久操作要求Admin、CSRF、`confirm=true`、一次性预览Token和确认短语“永久删除”。
- 每个候选是独立步骤，保存`pending/executing/completed/failed`、结果、错误和释放字节。事务中断后恢复器继续剩余步骤；已由旧进程删除的对象按回执标记为已应用，不重复副作用。
- 清理任务会同步处理子Agent会话、TestAgent证据、回放和执行产物；孤立附件必须超过24小时且没有任务引用。Cron、项目运行、附件和指标使用各自领域锁或SQLite事务。
- 页面刷新后恢复同一事务进度，展示成功、失败、释放空间和分页逐项结果。取消只停止后续步骤，已完成步骤保留真实结果。
- 项目运行状态继续使用共享文件锁、原子JSON和`.bak`恢复文件，清理不能覆盖并发运行写入。

## 接口与状态

- `GET /api/metrics`：聚合、作用域目录和系统快照。
- `GET /api/metrics/events`：结构化状态、时区日期和服务端分页。
- `GET /api/reliability/traces`：Admin分页读取脱敏Trace。
- `POST /api/reliability/diagnostics/run`：Admin诊断。
- `POST /api/reliability/drills/run`及查询、取消、SSE：异步可靠性演练。
- `GET /api/cleanup/summary`、`POST /api/cleanup/preview`、`POST /api/cleanup/run`：只读快照、预览和事务创建。
- `GET /api/cleanup/transaction`、`POST /api/cleanup/cancel`、`POST /api/cleanup/resume`：事务查看、取消与续跑。
- `POST /api/cleanup/storage-index/run`：显式后台存储扫描。

## 实现与验证

主要实现：

- `backend/system/observability-database.ts`
- `backend/system/reliability-ledger.ts`
- `backend/system/trace-sanitizer.ts`
- `backend/system/metrics-v3.ts`
- `backend/system/reliability-drills.ts`
- `backend/system/storage-index.ts`
- `backend/system/cleanup-center.ts`
- `backend/modules/collaboration/task-replay.ts`
- `frontend/src/components/agents/AgentMetrics.vue`
- `frontend/src/components/system/TraceReplay.vue`
- `frontend/src/components/system/cleanup/CleanupCenter.vue`

自动化回归覆盖多Node进程幂等和租约竞争、fencing token、并发Trace追加与脱敏、项目指标和结构化终态、事件分页、异步存储索引、清理事务及任务/TestAgent/回放级联、旧响应隔离和生产构建。测试使用隔离数据目录，Provider调用为`0`。
