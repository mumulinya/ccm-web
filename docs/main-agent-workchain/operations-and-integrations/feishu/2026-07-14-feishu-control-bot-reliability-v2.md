# 飞书控制机器人可靠性 v2

日期：2026-07-14  
状态：已实现并完成运行中服务验收

## 问题

飞书 WebSocket 能收到用户消息，但控制机器人仍指向旧 CCM 端口。旧全局 Agent 回合随后长时间无事件，飞书只保留“处理中”反应，没有回复。原健康检查只验证 PID 和 WebSocket，因而错误显示为健康。

## 根因证据

- 用户消息 `om_x100b6a55dd4434b4c0b56c53dd7b3f6` 于 19:10:49 被接收并开始处理。
- 日志出现 `session spawned`，之后没有 `turn complete`。
- 控制机器人配置目标为 `3080`，当前用户服务运行在 `3082`。
- cc-connect 最终到 21:10:50 才以两小时空闲超时回收该会话。

## 修复

- 控制机器人启动时读取已有配置中的 `--port`，仅在目标端口与当前服务一致时复用进程。
- 目标端口过期时，回收原控制机器人进程树并使用当前服务端口重建配置和长连接。
- ACP 调用增加默认 90 秒请求上限，可通过 `CCM_CONTROL_BOT_REQUEST_TIMEOUT_MS` 调整。
- 超时或连接异常不再只返回内部 JSON-RPC 错误，而是向原飞书会话发送简短提示并以 `end_turn` 正常收尾，使“处理中”反应可以被清理。
- `session/cancel`、`session/close` 和 `session/delete` 会中断对应的在途 HTTP 请求。
- 健康状态新增 `target_port`、`expected_port`、`endpoint_current`、`process_started_at`、`pending_turn_since` 和 `turn_stalled`；旧端口或超过两分钟未收尾的回合不再判定为健康，重启前的历史未收尾记录不会污染新进程。

## 回归

专项测试 `scripts/feishu-control-bot-reliability-selftest.mjs` 会启动一个故意不响应的本地 HTTP 服务，并验证：

- 请求在配置上限到达后被中断。
- 用户收到可理解的超时提示。
- ACP 返回 `end_turn`，而不是留下永久处理中回合。
- 源码仍保有旧端口重绑和端口感知健康检查。

运行命令：

```powershell
npm run test:feishu-control-bot-reliability
npm run test:feishu-channel
```

运行中验收需要确认控制机器人状态的 `target_port` 与当前 CCM 端口一致、`endpoint_current=true`、`turn_stalled=false`，并通过本地 ACP 到全局 Agent 的真实问答。

## 验收结果

- `npm run check`：通过。
- `npm run test:feishu-channel`：生产通道契约通过；专项卡死回归单独复跑通过。
- 卡死回归：请求在约 1.0 秒测试上限后中断，友好回复和 `end_turn` 均已断言。
- 当前 CCM：`3082`，服务 PID `32212`。
- 当前飞书控制机器人：PID `32928`，配置目标端口 `3082`，`endpoint_current=true`。
- 当前通道：`healthy=true`、`socket_connected=true`、`pending_turn_since=""`、`turn_stalled=false`。
- 飞书真实 Bot Info 探针成功，机器人名称和凭据可用。
- 本地真实控制消息经 `/api/feishu/control-bot/message` 在 189ms 返回全局 Agent 帮助内容。

本轮没有为了验收向用户飞书会话主动发送额外测试卡片。下一条用户真实飞书消息会经过已重绑的 WebSocket -> ACP -> `3082` 全局 Agent 链路。
