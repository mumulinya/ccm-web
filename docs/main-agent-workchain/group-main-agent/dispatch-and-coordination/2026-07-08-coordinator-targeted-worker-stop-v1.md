# Coordinator Targeted Worker Stop v1

日期：2026-07-08

## 背景

上一版已经让群聊主 Agent 能判断返工路由：

- 失败/证据缺口继续同一子 Agent。
- 独立验证换新的验证视角。
- 方向错了或用户改目标时，标记“停止旧方向并继续”。

但当路由是 `stop_wrong_direction_then_continue` 时，系统还只是保存决策元数据，没有真正把“停止旧方向”接到执行内核。

## 本次升级

新增执行内核的精准停止能力：

- `cancelActiveAgentRun()` 现在支持 `project` / `executionId` 过滤。
- 调用方可以传 `cancel_task:false`，只停止匹配的底层 Agent CLI 运行，不写任务级取消标记。
- 保留原有手动停止入口行为：没有显式关闭任务级取消时，仍可按任务级停止。

群聊主 Agent 返工派发现在会在 `requires_stop` 路由下执行：

1. 尝试停止同一任务、同一子 Agent 的旧运行。
2. 写入 `coordinator_wrong_direction_stop` timeline。
3. 向用户显示友好状态，例如“旧方向执行已发送停止请求”。
4. 给子 Agent 的新工作包注入“旧方向停止/不要继续旧方案/以新目标为准”的 continuation handoff。

## 用户体验

用户不需要看到 `cancel_task:false`、`executionId`、`same_worker_scratchpad` 等技术字段。可见区只展示：

- 哪个子 Agent 的旧方向已停止或无需停止。
- 主 Agent 接下来会按新要求继续。
- 技术详情里保留停止结果、路由策略和执行记录，便于排障。

## 验证点

新增自测覆盖：

- 错误方向路由会生成 `interrupt_current_run` handoff。
- handoff 中明确要求不要继续旧方向。
- 主 Agent 返工派发会调用精准停止路径。
- 执行内核支持 `project/executionId` 过滤与 `cancel_task:false`。

