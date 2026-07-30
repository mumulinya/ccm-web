# 可靠性、性能监控与清理中心

## 可观察性

- Agent、任务、工具、Token、耗时和终态写入结构化指标事件。
- 性能监控支持全局、群聊和项目作用域、预设天数和自定义日期范围；项目内区分项目主Agent、开发Agent和TestAgent。
- 执行记录支持完成、失败、取消、阻塞和历史未知状态筛选及服务端分页；所有终态都保留时间与耗时。
- Trace Replay按任务、项目、群聊、阶段、角色和状态筛选；事件图按来源checksum物化分页，前端使用请求generation拒绝旧任务响应。

## 可靠性账本

- 每个操作有trace ID；幂等键和任务租约写入SQLite，依靠事务、唯一约束和fencing token支持多进程原子认领。
- 长任务使用可续租的执行租约。有效租约不能因进程退出被竞争者直接抢占，服务重启只恢复已过期且可证明的租约。
- Trace事件按稳定ID和单调序号追加，统一脱敏并限制大小；Prompt、API Key、Cookie、环境变量和大工具结果不会进入Trace。
- 看门狗和启动恢复清理失效 in-progress 状态，并记录恢复事件。
- Git、工作树和测试演练在独立受管子进程异步执行，支持取消、超时、进程树终止、持久checkpoint和重启恢复；不会自动产生付费Provider调用。

## 清理中心

清理中心只处理已经归档或符合保留期的对象：

- 归档失败的项目运行：可恢复、非永久操作。
- 永久删除已归档任务：同时清理关联子 Agent会话、TestAgent证据、回放和执行工作树。
- 永久删除已归档定时任务。
- 永久删除已归档项目运行及关联产物。

危险清理必须先生成带候选指纹和10分钟有效期的预览，再使用一次性预览Token和确认短语执行。执行前重新核验对象未变化；每个候选作为持久幂等步骤执行，中断后可续跑，完整结果分页审计。存储统计由异步索引生成，摘要GET不递归扫描或修改注册表。不会清理活跃任务、canonical会话或未归档数据。

## 实现入口

- 数据库与指标：`backend/system/observability-database.ts`、`backend/system/metrics-v3.ts`
- Trace与租约：`backend/system/reliability-ledger.ts`、`backend/system/trace-sanitizer.ts`
- 稳定性：`backend/system/reliability-drills.ts`
- 清理：`backend/system/cleanup-center.ts`
- 存储索引：`backend/system/storage-index.ts`
- 页面：`AgentMetrics.vue`、`TraceReplay.vue`、`system/cleanup/*`

完整业务状态机、接口和恢复规则见[性能监控、Trace、可靠性与清理中心完整链路V2](../confirmed-business-processes/PERFORMANCE-TRACE-RELIABILITY-CLEANUP-V2.md)。
