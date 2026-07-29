# 可靠性、性能监控与清理中心

## 可观察性

- Agent、任务、工具、Token、耗时和终态写入结构化指标事件。
- 性能监控支持全局或群聊作用域、预设天数和自定义日期范围。
- 执行记录支持成功、失败、取消筛选和服务端分页；失败记录同样保留时间与耗时。
- Trace Replay按任务、项目、群聊、阶段、角色和状态筛选，可查看关键流程或二次展开原始系统事件。

## 可靠性账本

- 每个操作有 trace ID；幂等记录抑制重复提交。
- 长任务使用可续租的执行租约，服务重启时只恢复已过期且可证明的租约。
- 看门狗和启动恢复清理失效 in-progress 状态，并记录恢复事件。
- 24小时稳定性测试采集队列、任务、进程、内存、句柄和错误样本；不会自动产生付费 Provider调用。

## 清理中心

清理中心只处理已经归档或符合保留期的对象：

- 归档失败的项目运行：可恢复、非永久操作。
- 永久删除已归档任务：同时清理关联子 Agent会话、TestAgent证据、回放和执行工作树。
- 永久删除已归档定时任务。
- 永久删除已归档项目运行及关联产物。

危险清理必须先生成带候选指纹和10分钟有效期的预览，再使用一次性预览Token执行。执行前重新核验对象未变化，并写入审计历史；不会清理活跃任务、canonical会话或未归档数据。

## 实现入口

- 指标：`backend/modules/tools/tools.ts`
- Trace与租约：`backend/system/reliability-ledger.ts`
- 稳定性：`backend/system/soak-test.ts`
- 清理：`backend/system/cleanup-center.ts`
- 页面：`AgentMetrics.vue`、`TraceReplay.vue`、`system/cleanup/*`
