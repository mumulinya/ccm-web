# CC 源码级记忆压缩差异收口

Date: 2026-07-18

## 目标

本次在既有全会话对齐基础上，关闭最后一批 Claude Code 关键行为差异：完整模型可见 payload 计量、固定上下文 usage 身份、项目真实容量、cursor-first 窗口、完整轮次 PTL、异步 Session Memory、生命周期 hooks、恢复附件预算和 canonical summary fail-closed。

对照代码：

- `D:/claude-code/src/utils/tokens.ts:208`
- `D:/claude-code/src/services/compact/autoCompact.ts:28`
- `D:/claude-code/src/services/SessionMemory/sessionMemoryUtils.ts:31`
- `D:/claude-code/src/services/compact/sessionMemoryCompact.ts:324`
- `D:/claude-code/src/services/compact/compact.ts:393`

目标是对齐会话压缩的关键不变量，不复制 Statsig、遥测和 Provider 私有实现。

## 完成内容

### 统一模型可见 payload

`ModelVisiblePayloadSnapshot` 现在覆盖：

```text
system + tools + canonical summary + recent raw messages
+ pending request + recovery context + session_start hook results
```

无可信 usage 时，触发计量直接估算该完整 payload。有 usage 时，基线必须匹配精确 `scope/session/provider/model/generation/boundaryGeneration`，并额外匹配 `fixedContextChecksum`；固定 system、工具、恢复上下文或 hooks 改变后，旧 usage 自动失效。

Provider usage 保存：

- `payloadChecksum`
- `fixedContextChecksum`
- `estimatedFixedTokens`
- `estimatedPayloadTokens`

压缩后的 gate 在 `session_start` 完成后运行。hook 新增大量内容、恢复附件过大或摘要加近期原文仍超阈值时，边界不提交。

### CC 窗口和 PTL

共享窗口从 Session Memory cursor 后开始，低于 `10K token / 5 条文本消息` 时向前扩展，常规在约 `40K token` 停止。窗口不会越过上一 compact floor，并迭代闭合：

- 完整用户轮次；
- tool-use/result；
- 同一 assistant response；
- thinking/tool block；
- 群聊 task transaction。

迭代闭包修复了一个真实边界问题：同一 assistant response 向前扩展后若新纳入 tool-result，会再次补齐对应 tool-use，而不是停在半闭合状态。

全局和项目 PTL 均最多执行三次恢复，每次删除最旧完整 API 轮次。单轮仍超限或三次后仍失败时 fail closed；原 transcript 不变。

### Canonical summary

- 全局底层提交函数必须显式收到通过校验的 `model` 或 `session_memory` 摘要。
- 群聊无论配置入口如何，都不能提交 `structured/hybrid/local` canonical summary。
- 项目和全局读取旧 `local_selftest/structured/unknown` 时将其惰性视为非 canonical，从原 transcript 重新模型压缩。
- deterministic summary 只作为 preservation reference 和保真校验输入。
- 项目会话同时校验 V2 摘要和兼容字段，二者分叉或 checksum 篡改时拒绝注入。

### Session Memory 和 hooks

全局和项目在成功 assistant 轮次后按 `10K 初始化 / 5K 增长 / 3 次工具调用` 异步调度模型提取。compact 只等待已存在任务最多 15 秒，不在压缩临界路径临时启动提取。

异步结果提交前验证 session、cursor、transcript checksum 和 boundary generation。迟到或身份变化的结果丢弃，普通模型 compact 继续兜底。

共享内置 hooks 不执行 shell：

```text
pre_compact -> session_start -> post_compact
```

群聊继续复用原有 scope hooks；共享 hooks 只传递用户要求、精确 scope 恢复材料和生命周期审计。

### 恢复上下文

项目文件恢复只读取摘要中真实记录、当前仍存在且位于项目根目录内的文本文件：

- 最多 5 个近期文件；
- 单文件最多 5K token；
- 文件总预算 50K token；
- 技能单项 5K、总计 25K，且仅接受显式 verified 内容。

全局 Agent 不自动读取项目文件，只保留全局会话中的引用，继续严格排除群聊和项目记忆。群聊复用已有文件、技能、计划和工具连续性验证投影。

### Scope 收口

- **Global**：自动压缩拿到与真实调用一致的 global-only 固定上下文、工具定义和 pending request；usage 保存 payload identity。
- **Group**：共享 payload 触发计量、共享窗口、模型硬要求、最终 payload gate 和共享 hooks 已接入；原 task/tool 闭包继续保留。
- **Project**：精确 scope 覆盖优先，其次可信 Provider/model 容量，最后全局预设；服务端直接记录第三方 Agent usage；成功提交后才轮换 generation。
- **`tas_*`**：最终 prompt 完整计量；本地摘要和字符投影不能解锁 Provider 调用；native compact 无法证明时要求换 generation 并回注父会话 canonical context。

## 接口与 Memory Center

compact 状态/API 增加并展示：

- `model_visible_payload`
- `resolved_model_capacity`
- `pending_request_tokens`
- `recovery_context_tokens`
- `hook_result_tokens`
- `ptl_recovery_attempts`

Memory Center 优先显示精确会话已解析的 Provider 容量和用户显式阈值。全局列表也直接显示当前 Token/自动压缩线。桌面和移动端保持 scope/list 独立滚动。

## 验证

| Suite | 结果 |
| --- | ---: |
| `all-session-cc-compaction-alignment-selftest.mjs` | 51/51 |
| `global-agent-model-session-compaction-selftest.mjs` | 34/34 |
| `project-session-native-binding-restart-selftest.mjs` | 66/66 |
| `session-memory-dynamic-window-selftest.mjs` | 23/23 |
| `group-cc-compaction-core-alignment-selftest.mjs` | 18/18 |
| `group-session-memory-api-invariant-closure-restart-selftest.mjs` | 14/14 |
| `group-session-memory-compact-selection-restart-selftest.mjs` | 15/15 |
| `memory-center-live-token-display-selftest.mjs` | 23/23 |
| `final-worker-dispatch-payload-gate-restart-selftest.mjs` | 17/17 |
| `final-dispatch-provider-usage-baseline-restart-selftest.mjs` | 35/35 |
| `final-worker-dispatch-reactive-compact-restart-selftest.mjs` | 18/18 |

Production build：frontend、MCP Feishu、backend 均通过。浏览器检查：`1280x720` 和 `390x844` 均无横向溢出，scope 列表与详情可独立滚动。所有模型路径使用 mock，真实付费 Provider 调用为 `0`。

## 不包含

本次没有新增 shell hooks、WAL、live soak、成本审批、replay 工单或主界面诊断卡片。原始 transcript 不删除，旧状态惰性规范化，不批量迁移，不双写另一套压缩系统。
