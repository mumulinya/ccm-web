# 会话上下文用量常驻指示器

## 目标

在全局 Agent、群聊主 Agent 和项目 Agent 的输入区常驻显示当前精确会话的上下文用量，交互形态参考 Claude Code/Codex composer 的 `context used` 读数。

该读数只展示既有记忆压缩系统的状态，不改变压缩触发、摘要生成、边界提交或原始 transcript。

## 数据口径

- 主百分比：`currentTokens / effectiveContextWindow`。
- Token 明细：`currentTokens / effectiveContextWindow`，使用 K/M 紧凑格式。
- 自动压缩进度：`currentTokens / autoCompactThreshold`，只用于预警状态，不冒充模型总容量。
- 状态：正常、接近自动压缩线、达到自动压缩线、超过模型窗口、压缩中、熔断、不可用。

数据来自 `GET /api/memory-center/scope`，按精确会话读取：

- 全局：`global_session / session:<sessionId>`
- 群聊：`group / <groupId>::<gcsSessionId>`
- 项目：`project_session / <project>::<sessionId>`

## 刷新行为

- 会话切换后立即读取。
- 消息数量或发送状态变化后延迟刷新，覆盖正常发送、自动压缩和 `/compact` 命令结果。
- 每 15 秒低频校准一次，避免界面长时间停留时数字过期。
- 新请求会取消同一组件的旧请求，防止切换会话后旧响应覆盖新会话。
- 接口失败时保留为不可用状态，不伪造 Token。

## 界面

- 群聊和项目输入框右下角显示紧凑 Gauge + 百分比，输入框预留右侧空间。
- 全局输入区在发送按钮前显示同一组件。
- hover/focus 展开 `xx% context used`、`used / capacity tokens`、自动压缩线和当前状态。
- 低于 1% 时保留一位小数，避免把已有上下文显示成 `0%`。

## 验证证据

- `npm run test:session-context-usage-ui`：12 项静态契约通过。
- `npm run test:memory-center-live-token-display`：Memory Center 精确会话 Token 与阈值回归通过。
- `npm run build:frontend`：Vite production build 通过。
- 浏览器桌面 `1280x720`：全局、群聊、项目均显示精确会话读数，无发送按钮重叠，无横向溢出。
- 浏览器手机 `390x844`：三个入口的读数均可见，群聊/项目读数位于 textarea 内且不覆盖发送按钮，全局读数位于 composer 内，无横向溢出。
- 测试没有调用付费 Provider。
