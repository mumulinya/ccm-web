# 飞书 ACP 旧会话卡死与快速失败修复

## 事故结论

2026-07-25 12:58 的全局飞书消息恢复了长期未使用的 ACP 会话。该会话没有把 prompt 交给 CCM，也没有产生 Agent 事件。后续消息进入 cc-connect 队列，直到默认 `idle_timeout_mins = 120` 在 14:58 才释放会话。17:59 的消息再次以相同行为超时，证明问题不是偶发的飞书投递延迟。

这不是前端资源未打包造成的。运行中的 CCM 后端和 ACP 适配器已经来自当前构建，但外部 `cc-connect` 仍为 1.3.2，并且生成配置没有显式的旧会话轮换和快速失败边界。

## 修复

- CCM 包直接依赖 `cc-connect ^1.4.1`，运行时优先使用包内版本，不再受机器上旧全局版本影响。
- 新配置使用 cc-connect 1.4.1 的 `cmd` 字段，不再写入已弃用的 `command` 字段。
- ACP 能力声明改为 `loadSession: true`，与已经实现的 `session/load` 行为一致。
- 全局飞书控制通道设置：
  - `reset_on_idle_mins = 0`，避免把运行层轮换提示作为聊天回复展示
  - `idle_timeout_mins = 4`
  - `max_turn_time_mins = 5`
- 项目飞书通道设置 12 分钟执行边界，并关闭 cc-connect 的可见空闲轮换。CCM 权威会话、上下文重建、压缩恢复和 generation 管理继续独立生效。
- 安装脚本发现低于 1.4.1 的全局 cc-connect 时自动升级。
- ACP 自身的全局请求 90 秒硬超时继续保留；任何层级卡死都不能再等待两小时。

## 验证

- `node scripts/feishu-control-bot-reliability-selftest.mjs`
- `node scripts/feishu-channel-production-selftest.mjs`
- `npm run check`
- `npm run build:backend`
- 重新生成控制机器人配置并重启后，确认配置含三项会话边界。
- 测试 Provider 使用 mock，不进行真实付费模型调用。
