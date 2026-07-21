# 群聊主 Agent 未压缩完整上下文对齐

日期：2026-07-20

## 问题

群聊主 Agent 的正式压缩核心已经具备模型摘要、Session Memory、动态近期窗口和熔断，但真正调用模型前仍由路由生成固定条数上下文：

- 主 Agent 常用入口：最近 20 条、最后 6 条较完整、较旧 36 条本地摘要。
- 任务队列入口：最近 12 条、最后 5 条较完整、较旧 30 条本地摘要。
- 直接项目成员入口：最近 10 条、最后 5 条较完整、较旧 24 条本地摘要。
- Provider 返回 prompt-too-long 后，主 Agent 还可能使用 48,000 字符的首尾裁切重试。

因此会话即使没有达到正式压缩线，模型也看不到完整原文。

## 当前流程

```text
用户向精确 gcs_* 会话发送消息
  -> 从该会话原始 transcript 构建完整模型上下文
  -> 构建主 Agent system、Skill、共享文件、RAG、恢复指令和当前请求
  -> 使用最近真实 Provider usage + 完整 payload 估算执行同步自动压缩预检
  -> 未达到模型容量线：完整原文直接进入本轮 Provider 请求
  -> 达到容量线：执行正式模型压缩 / Session Memory
  -> compact head 提交成功后，在同一轮重建完整主 Agent payload
  -> 正式摘要 + 10K-40K 动态近期完整原文进入 Provider 请求
  -> 压缩失败或重建后仍超限：fail closed
```

后续收口已删除用户直连项目成员、非编排广播和 `/api/groups/broadcast`。用户入口现在只到群聊主 Agent；主 Agent 内部派发的项目子 Agent 继续使用精确父会话连续性。详见 [群聊主 Agent 单入口与全局 Provider 上下文对齐](../group-main-only-global-provider-cc-context-2026-07-20/README.md)。

## CC 对齐点

对照 `D:\claude-code\src\query.ts` 与 `src/services/compact/autoCompact.ts`：

- 在 Provider 调用前对当前完整模型 payload 做自动压缩判断。
- 未达到阈值时保留全部普通 user/assistant 会话原文。
- 达到阈值后在同一轮使用 `buildPostCompactMessages` 语义重建请求。
- 自动阈值按模型窗口减最多 20K 摘要输出预留和 13K buffer。
- Provider PTL 不再用本地字符首尾裁切；CCM 改走正式模型压缩，继续受三次失败熔断约束。
- 正式压缩后的原文窗口继续使用 10K token、至少 5 条文本消息、约 40K token 上限和完整 API 轮次边界。

CC 的 microcompact 仍可清理可恢复的旧工具结果；本次删除的是普通会话消息的固定条数/字符投影，不影响共享工具结果压缩机制。

## 代码入口

- 精确会话投影：`backend/modules/collaboration/group-session-model-context.ts`
- 群聊主 Agent 中央 Provider 预检：`backend/modules/collaboration/group-orchestrator-routing.ts`
- 群聊主 Agent 与内部派发入口：`backend/modules/collaboration/group-live-routes-part-02-part-02.ts`
- 队列任务主 Agent 入口：`backend/modules/collaboration/collaboration-task-executor.ts`
- 专项回归：`scripts/group-main-uncompacted-cc-context-selftest.mjs`

`buildGroupContextPacket` 与 `buildReactiveCompactionContext` 暂时只保留为兼容导出和旧自测工具，生产模型调用点为 0；它们不能成为 canonical context，也不能绕过最终容量门禁。

## 验证

- `npm run test:group-main-uncompacted-cc-context`：20 项通过。
- `node scripts/group-cc-compaction-core-alignment-selftest.mjs`：18 项通过。
- `node scripts/all-session-cc-compaction-alignment-selftest.mjs`：51 项通过。
- `node scripts/final-worker-dispatch-payload-gate-restart-selftest.mjs`：17 项通过。
- `node scripts/child-parent-session-cc-context-selftest.mjs`：25 项通过。
- `runCoordinatorProtocolSelfTest()`：通过。
- backend production build、split exports 和 factory deps：通过。
- 所有新增测试使用 mock compaction，真实付费 Provider 调用为 0。

两个旧测试仍检查已废弃行为，不作为本次回归：`group-memory-resume-integration-selftest.mjs` 要求本地 resume projection 自动创建 deterministic compact boundary；`group-memory-auto-compact-circuit-breaker-restart-selftest.mjs` 要求 `memoryCompactionUseModel=false` 的手动压缩能够提交 canonical summary。这两项都与当前“正式摘要必须来自模型”的硬约束冲突。
