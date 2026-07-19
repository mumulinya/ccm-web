# 项目子 Agent 父会话 CC 风格完整上下文

日期：2026-07-19

## 目标

修正群聊主 Agent 向项目子 Agent 派发任务时的父会话上下文。旧实现固定读取最近 15 条消息，其中只有最后 5 条保留较长正文，更早消息还会生成本地规则摘要；这会在正式压缩前提前丢失上下文，也不符合 Claude Code 的会话连续性原则。

## 当前业务流程

```text
群聊主 Agent 准备派发项目子 Agent
  -> 绑定精确 groupId + gcs_* 会话
  -> 尚无正式 compact head：注入当前会话全部原始消息
  -> 构建项目记忆、工具、工作单和最终 Provider prompt
  -> 按项目子 Agent 的可信模型容量执行最终 Token 门禁
  -> 未到阈值：直接派发完整父会话
  -> 达到阈值：执行群聊正式模型压缩事务
  -> 提交成功后重建 invocation、memory bundle、handoff、契约和 prompt
  -> 注入正式模型摘要/Session Memory + 10K-40K 动态近期完整原文
  -> 压缩后再次执行完整 payload 门禁
  -> 仍超限或任何事务失败：阻止第三方 Provider 调用
  -> Provider fallback：按新模型容量重复同一套“测量 -> 正式压缩 -> 重建”事务
```

## 核心不变量

- 压缩前不使用固定消息条数、字符截断或本地摘要，最早消息和长消息原文保持完整。
- `structured`、`deterministic` 等本地摘要不能成为项目子 Agent 的 canonical context。
- 只有 `model` 或校验通过的 `session-memory` 摘要可以替代旧原文。
- 压缩后的近期窗口复用共享 Session Memory 选择器，保持 compact boundary、完整轮次、tool-use/result 和同一 assistant response。
- 是否压缩按最终子 Agent prompt 和该子 Agent 的真实模型容量决定，不按群聊消息条数决定。
- compact head 提交后，旧的 invocation、bundle、handoff 和 prompt 全部重建；时间线与记忆快照只记录最终实际派发版本。
- 首选 Provider 切换到容量更小的 fallback Provider 时，按 fallback 模型重新测量并最多重建一次，不沿用首选模型的容量结论。
- 原始 transcript 永不删除。模型压缩失败、重建失败或 post-compact gate 失败均 fail closed。
- 连续三次失败的熔断绑定精确 `groupId + gcs_* + tas_*`，兄弟会话互不影响。

## CC 源码对照

本次重新核对 `D:\claude-code` 当前源码：

- `src/query.ts` 在真正调用模型前执行 auto compact，成功后用 `buildPostCompactMessages()` 重建同一轮请求。
- `src/services/compact/autoCompact.ts` 按模型 context window 减最多 20K 摘要输出预留和 13K buffer 触发，并在连续 3 次失败后停止重试。
- `src/services/SessionMemory/sessionMemoryUtils.ts` 使用 10K 初始化、增长 5K、3 次工具调用和 15 秒等待。
- `src/services/compact/sessionMemoryCompact.ts` 保留至少 10K token、至少 5 条文本消息、最多约 40K token，并修复 tool-use/result 与同一 assistant message 边界。
- `src/services/compact/compact.ts` 的 PTL 恢复最多 3 次，按完整 API round 删除最旧上下文；成功结果由 boundary、摘要、保留消息、附件和 hook 结果组成。

CC 的通用子 Agent 本身并不等同于 CCM 的“群聊主 Agent -> 项目子 Agent”业务层。本次对齐的是 CC 的会话压缩与同轮重建不变量，并按 CCM 的明确需求把父 `gcs_*` 连续性作为项目子 Agent 的输入。

## 长期记忆与会话记忆

项目 V4 长期记忆仍通过 `projectExecutionBrief` 按任务召回，用于跨会话稳定约束、决策和经验。父群聊会话通过本次连续性投影单独注入，用于当前会话中的具体要求、纠正、附件引用和未完成事项。两套数据职责不合并，也不会用长期记忆替代当前完整会话。

## 代码入口

- 父会话投影：`backend/modules/collaboration/group-memory-context-part-05.ts`
- 子 Agent 派发事务：`backend/modules/collaboration/collaboration-cross-agents-part-01.ts`
- 正式群聊压缩：`backend/modules/collaboration/group-memory-context-part-01.ts`
- 最终容量门禁：`backend/agents/final-dispatch-payload-gate.ts`
- 专项回归：`scripts/child-parent-session-cc-context-selftest.mjs`

## 验证证据

- `npm run test:child-parent-session-cc-context`：25 项通过。
- `npm run test:final-worker-dispatch-payload-gate-restart`：12 + 5 项通过。
- `npm run test:final-worker-dispatch-reactive-compact-circuit-breaker-restart`：16 项通过。
- `npm run test:group-cc-compaction-core-alignment`：18 项通过。
- `npm run test:all-session-cc-compaction`：51 项通过。
- `npm run build:backend`：通过。
- 所有测试使用本地夹具或 mock，真实付费 Provider 调用为 0。
