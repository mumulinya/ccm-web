# Provider 超时与任务级熔断

## 问题

旧实现虽然允许在 Provider 配置中填写 `120000ms`，共享模型客户端却用历史默认值把单次请求压缩到 30 秒。群聊主 Agent 在第一次五次尝试失败后仍可能进入 `daily-dev-model-dispatch-repair`，随后任务恢复与监工再次入队，造成同一长任务连续重复调用。

## 当前规则

### 模型请求预算

- `timeoutMs` 是单次 Provider 请求的真实超时，用户配置 120 秒时不会再降为 30 秒。
- 未显式配置时继续使用 30 秒默认值。
- 快速的 429、5xx、网络错误、空响应和无效 JSON 最多尝试 5 次。
- 普通总预算至少 180 秒；长请求总预算最多 360 秒。
- 总预算不足以再执行一个完整长尝试时，最后一次尝试使用剩余预算，不突破六分钟边界。
- 重试耗尽错误携带 `CCM_MODEL_RETRY_EXHAUSTED`、实际尝试次数、单次超时和总耗时，供任务层可靠判断。

### `llm-error` 短路

群聊主 Agent 返回 `runtime: llm-error` 时：

1. 不进入 `daily-dev-model-dispatch-repair`。
2. 不创建沙盘派发或子 Agent 工作项。
3. 记录一次 Provider 失败与任务级熔断事件。
4. 本轮任务按失败收口，保留原始错误和模型计量证据。

`llm-not-configured` 同样禁止进入派发修复，但不会伪装成可恢复的模型输出。

### 任务级冷却

每个任务独立保存 `provider_circuit`：

- 第一次连续失败冷却 5 分钟。
- 24 小时内再次失败依次升级为 15、30、60 分钟。
- 冷却期间，队列入口、启动恢复、自动返工、Mission 监工和手动重试都会被同一门禁拦截。
- 冷却结束后允许一次半开探测；成功后关闭熔断，失败则升级下一档。
- 熔断只绑定当前任务，不阻塞其他任务或其他 Provider。

任务时间线展示“主 Agent Provider 进入任务级冷却”和可重试时间；Provider 恢复后展示关闭事件。内部错误、尝试次数和熔断结构保留在排障数据中。

## 代码边界

- `backend/system/model-call-retry.ts`：共享重试与机器可读耗尽错误。
- `backend/modules/collaboration/group-orchestrator-llm-client.ts`：真实单次超时和动态总预算。
- `backend/modules/collaboration/provider-task-circuit-breaker.ts`：纯任务级熔断状态机。
- `backend/modules/collaboration/collaboration-task-executor.ts`：`llm-error` 短路与时间线。
- `backend/modules/collaboration/collaboration-task-runtime.ts`：所有重新入队来源的统一门禁。

## 验证

- `scripts/unified-model-retry-selftest.mjs`
- `scripts/provider-task-circuit-selftest.mjs`

测试使用 mock Provider，不调用付费模型。
