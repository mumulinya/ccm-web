# 全会话 CC 风格压缩对齐

Date: 2026-07-18

## 目标

本次工作把全局 Agent、群聊 `gcs_*`、项目会话和 `tas_*` worker 统一到同一组 Claude Code 风格压缩不变量。实现参考 `D:/claude-code` 中的 token 计算、自动压缩、Session Memory、普通 compact 和 prompt-too-long 恢复流程，不复制无关 UI 或 Provider 私有实现。

对照入口：

- `D:/claude-code/src/utils/tokens.ts:208`
- `D:/claude-code/src/services/compact/autoCompact.ts:28`
- `D:/claude-code/src/services/SessionMemory/sessionMemoryUtils.ts:31`
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts:56`
- `D:/claude-code/src/services/compact/compact.ts:393`

## 交付行为

1. 模型摘要或校验通过的模型 Session Memory 才能成为正式摘要。
2. 上一轮摘要始终进入下一轮压缩，保留 S1 -> S2 -> S3 连续性。
3. 模型收到摘要和 `10K-40K token` 动态近期原文，不再使用固定条数或只有消息 ID 的窗口。
4. 自动触发采用最近可信 Provider usage 加 usage 锚点后的新增消息估算。
5. 压缩后仍超过阈值时不提交边界。
6. 连续三次失败只熔断当前精确会话。
7. 原始 transcript 始终保留。

## 数据流

```text
latest provider usage
  + messages after anchor
  + system/tools/recovery payload when estimating
  -> token measurement
  -> auto compact decision
  -> verified Session Memory or model compact
  -> post-compact token gate
  -> boundary commit
  -> summary + recent raw turns + recovery context + hooks
  -> next model/provider call
```

`/compact` 带自定义要求时跳过旧 Session Memory，直接走模型摘要。普通模型 compact 遇到 prompt-too-long 最多移除三轮最旧完整 API round；该操作只改变压缩请求，不删除原 transcript。

## V2 状态

共享类型为 `SessionCompactionStateV2`，核心字段包括：

```text
activeSummary / activeSummaryChecksum / previousSummaryChecksum
lastCompactedIndex / lastCompactedMessageId
preservedRecentMessageIds / preservedRecentTokens / preservedRecentTextMessageCount
latestProviderUsage / tokenMeasurement
sessionMemoryState / postCompactGate
consecutiveFailures / lastFailureAt / lastError
lastCompactedAt / boundaryGeneration
```

旧记录在读取时惰性规范化。已有摘要作为第一代摘要继续使用；无法恢复的历史内容保持未知，不编造，不双写旧新状态。

## Usage 身份

可信 usage 绑定：

```text
scope + sessionId + provider + model + generation
+ boundaryGeneration + anchorMessageId
```

模型、Provider、会话、generation 或 compact 边界变化后，旧基线失效。计算口径为：

```text
input + cache_creation + cache_read + output + anchor 后新增消息估算
```

其中 direct input 不会与 input 重复计算。无可信 usage 时估算完整模型可见 payload。

## 动态窗口

- 至少保留约 `10K token`；
- 至少保留 5 条文本消息；
- 常规上限约 `40K token`；
- 保持用户/assistant 完整轮次；
- 保持 tool-use/result 闭包；
- 保持同一 assistant response 的内容完整。

自动阈值默认由模型上下文容量减最多 `20K token` 摘要输出预留，再减 `13K token` 缓冲。用户在 Memory Center 明确设置的阈值优先。

## Session Memory

- 首次达到约 `10K token` 时初始化；
- 上下文再增长约 `5K token` 后更新；
- 有工具调用时累计约 3 次后允许更新；
- compact 前最多等待异步提取 15 秒；
- session、cursor 或 checksum 不匹配时回退普通模型 compact；
- 自定义 `/compact` 不复用旧 Session Memory。

Session Memory 仍是模型提取结果，本地规则只验证身份、完整性和容量。

## Scope 行为

### Global

压缩状态按 `memory.sessions[]` 隔离。全局长期记忆与会话连续性分开注入，且全局模型永不读取群聊或项目记忆。加密 transcript 提供动态近期原文。

### Group

保留多群聊、多 `gcs_*`、工具闭包、hooks、PTL 和 compact-head fencing。模型结果或 Session Memory 超阈值时拒绝提交。

### Project

CCM 项目会话保持稳定，第三方 Agent 原生 generation 可连续复用。服务端记录 usage；只有 compact 提交成功后才轮换 generation 并回注正式连续性上下文。

### Worker

`tas_*` 使用父会话的正式连续性快照，不产生本地 canonical summary。Provider 原生 compact 无法证明执行时，标记当前 generation 无效；最终 payload 仍超阈值则阻止 Provider 调用。

## 生命周期与失败策略

hook 顺序固定为：

```text
pre_compact -> session_start -> post_compact
```

以下情况 fail closed：

- 模型不可用；
- 摘要为空或校验失败；
- Session Memory 身份、cursor 或 checksum 不匹配且模型 compact 也失败；
- 三次 prompt-too-long 恢复后仍失败；
- post-compact payload 仍超过阈值；
- worker 最终 payload 超阈值。

失败时不推进 compact boundary，不轮换项目 generation，不用本地摘要替代，也不删除原 transcript。

## Memory Center

页面按全局会话、群聊会话、项目会话和任务 Agent 会话显示独立状态。2026-07-18 的 UI 复查同时修复了：

- 群聊 V2 token measurement 被空 transcript 估算覆盖的问题；
- detail API 原始 scope ID 覆盖友好会话名的问题；
- 手机端页签和刷新按钮分两行的问题。

桌面和移动端均使用独立的 scope-list 与 detail 滚动区。

## 验证证据

| Suite | 结果 |
| --- | ---: |
| `all-session-cc-compaction-alignment-selftest.mjs` | 51 |
| `global-agent-model-session-compaction-selftest.mjs` | 34 |
| `project-session-native-binding-restart-selftest.mjs` | 66 |
| `session-memory-dynamic-window-selftest.mjs` | 23 |
| `group-cc-compaction-core-alignment-selftest.mjs` | 18 |
| `group-session-memory-compact-selection-restart-selftest.mjs` | 15 |
| `memory-core-session-isolation-selftest.mjs` | 8 |
| `memory-center-live-token-display-selftest.mjs` | 23 |
| `final-dispatch-provider-usage-baseline-restart-selftest.mjs` | 35 |
| `final-dispatch-provider-identity-baseline-restart-selftest.mjs` | 23 |

另外验证了 true post-compact 超限不提交、worker 最终 gate、阻断收据重启持久化和原 transcript 保留。frontend、MCP、backend production build 全部通过；浏览器覆盖 `1280x720` 与 `390x844`；真实付费 Provider 调用为 `0`。

完整 payload checksum、迭代 API 闭包、异步提取和恢复附件预算的最终证据见 [CC 源码级记忆压缩差异收口](../cc-source-parity-closure-2026-07-18/README.md)。

## 非目标

本次没有新增 live soak、成本审批、replay 工单、WAL、shell hook 执行或主界面诊断账本。typed memory 蒸馏仍用于长期检索，不是会话压缩摘要的替代品。
