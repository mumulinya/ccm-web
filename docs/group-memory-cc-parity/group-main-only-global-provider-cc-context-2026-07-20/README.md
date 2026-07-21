# 群聊主 Agent 单入口与全局 Provider 上下文对齐

日期：2026-07-20

## 目标

收敛用户与群聊的交互模型，并补齐全局 Agent 在真实 Provider 调用边界上的 CC 风格上下文行为：

- 用户只向群聊主 Agent 发消息。
- 群聊主 Agent 可以继续在内部向项目子 Agent 分派任务。
- 全局 Agent 每一次模型调用都检查真实最终消息，而不是只在会话启动时检查一次。
- 正式压缩必须在提交边界前用候选摘要重建下一轮真实 Payload，并通过后置门禁。

## 群聊业务流

```text
用户消息
  -> 精确 gcs_* 会话
  -> 群聊主 Agent
  -> 主 Agent 判断回答、分析、澄清或派发
  -> 需要执行时由 processCrossAgents 调用项目子 Agent
  -> 主 Agent 汇总、复核并回复用户
```

已经删除：

- `/api/groups/broadcast` 广播 API。
- `/api/groups/send` 中直接调用项目成员的 Provider 分支。
- 非编排模式下把用户消息并行发送给所有成员的分支。
- 前端 `targetAgent` 和 `target_project` 发送字段。
- 仅为上述入口服务的 `prepareExactGroupSessionRenderedPayload` 通用包装器。

旧客户端显式提交项目成员目标时，服务端返回 `410 / GROUP_DIRECT_MEMBER_REMOVED`，不会悄悄调用项目 Agent。`all`、空目标和协调者目标统一进入群聊主 Agent。

## 全局 Agent 上下文流

```text
构建当前模型消息
  -> system + 工具定义 + 全局长期记忆 + 精确会话连续性
  -> 未压缩：当前会话全部原始消息
  -> 已压缩：正式模型摘要 + 动态近期完整原文
  -> 加入当前运行状态、工具观察和当前请求
  -> 对最终 Provider messages 做 Token 计量
  -> 低于阈值：直接调用 Provider
  -> 达到阈值：正式模型 / Session Memory 压缩
  -> 用候选摘要和保留原文重建真实下一轮 messages
  -> 后置门禁通过后才提交 compact boundary
  -> 当轮使用重建后的 messages 调用 Provider
```

每个 Agentic loop 步骤都会执行预检，因此工具观察、运行状态和后续补充导致 Payload 增长时也会触发自动压缩。Provider 返回 prompt-too-long 时走同一个正式压缩事务；模型摘要失败、熔断、没有可压缩完整轮次或压缩后仍超限时 fail closed。

## 不变量

- 全局长期记忆不注入群聊 transcript、群聊记忆或项目记忆。
- 每个全局会话独立保存 transcript、摘要、usage、边界和失败计数。
- 本地规则摘要不能成为 canonical summary。
- 原始加密 transcript 不因压缩删除。
- 压缩边界只在候选摘要校验、恢复 hooks 和真实最终 Payload 门禁全部通过后提交。
- 群聊成员仍存在于项目执行目录中，但用户不能绕过群聊主 Agent 直接调用它们。

## 代码入口

- 群聊目标收敛：`backend/modules/collaboration/group-orchestrator-routing.ts`
- 群聊发送入口：`backend/modules/collaboration/group-live-routes-part-02-part-01.ts`
- 群聊主 Agent 与内部派发：`backend/modules/collaboration/group-live-routes-part-02-part-02.ts`
- 全局每步模型预检：`backend/modules/global/global-agent-agentic-runtime.ts`
- 全局模型消息重建：`backend/agents/global/global-agent-run-projection.ts`
- 全局压缩事务：`backend/agents/global/memory.ts`
- 专项测试：`scripts/group-main-only-global-cc-context-selftest.mjs`

## 验证

- `npm run test:group-main-only-global-cc-context`：22 项通过。
- `node scripts/group-main-uncompacted-cc-context-selftest.mjs`：20 项通过。
- `node scripts/global-agent-model-session-compaction-selftest.mjs`：40 项通过，包含 S1 -> S2 -> S3。
- `node scripts/all-session-cc-compaction-alignment-selftest.mjs`：51 项通过。
- `node scripts/child-parent-session-cc-context-selftest.mjs`：25 项通过。
- backend production build：通过。
- frontend production build：通过。
- 新增测试真实付费 Provider 调用：0。

