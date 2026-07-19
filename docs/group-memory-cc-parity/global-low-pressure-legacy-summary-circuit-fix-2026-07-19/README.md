# 全局与项目会话低压力误熔断修复

## 现象

全局 Agent 会话显示约 `99.4K / 980K tokens`、上下文占用 `10.1%`，明显低于约 `900K` 的自动压缩阈值，但发送普通消息时返回“当前全局会话记忆压缩已熔断，本轮未调用模型”。

## 根因

- 该精确会话保存了一份旧版本地规则摘要，没有可信的 `summarySource`。
- 自动压缩把“旧摘要需要重新验证”放在低阈值判断之前，导致低压力会话也启动模型压缩。
- 旧摘要的 V1 边界与 V2 状态不一致，压缩请求覆盖了大量原始消息。
- 压缩器要求模型逐项复述服务端消息 ID，连续三次返回 `source_boundary_mismatch` 后打开了精确会话熔断器。
- Agent 请求层看到熔断结果后直接阻止主模型调用，因此错误表现成“会话不能继续对话”。

## 修复

- 非手动压缩时始终先执行真实 Token 阈值判断；低于阈值直接跳过，不因旧摘要启动压缩。
- 没有 `model` 或 `session_memory` 来源的旧摘要只保留审计记录，不注入触发计量、模型连续性或长期记忆上下文。
- 不可信旧摘要回退到加密原始 transcript，原始会话内容不删除。
- `sourceMessageIds` 改由服务端根据压缩 segment 绑定；模型只负责摘要语义，不再机械复述消息边界。
- 对历史上仅由 `source_boundary_mismatch` 造成的旧摘要熔断执行精确会话惰性修复，其他真实模型失败仍保持 fail-closed。
- 项目会话存在同型判断，已同步使用相同阈值优先级、服务端边界绑定和精确会话修复策略。

## 回归

- `npm run check`：通过。
- `npm run build:backend`：通过，并已重启 `http://127.0.0.1:3080`。
- `global-agent-model-session-compaction-selftest.mjs`：40 项通过。
- `project-session-native-binding-restart-selftest.mjs`：72 项通过。
- `global-memory-center-session-projection-selftest.mjs`：16 项通过。
- `session-memory-dynamic-window-selftest.mjs`：23 项通过。
- 当前精确会话 `session_1784034011435` 修复后状态：`99,357 / 900,000 tokens`、压力 `11%`、剩余 `800,643`、`consecutiveFailures=0`、`circuitOpen=false`。
- 旧摘要仍保留在存储审计记录中，但连续性输出为 `summary=null` 并回退到完整加密 transcript；没有删除原始消息。
- 修复前记忆文件备份：`C:\Users\admin\.cc-connect\global-agent-memory\memory.json.bugfix-20260719-0020.bak`。
- 真实 Provider 调用为 `0`。

`global-memory-center-session-render-selftest.mjs` 的旧 live fixture 仍写死“1 个全局会话”，当前真实数据为 2 个，因此在产品断言前超时；这是测试数据陈旧，不是本次压缩门禁回归。
