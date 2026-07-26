# CC-Switch Claude Provider 同步

## 问题

此前“开发 Agent / Claude Code API”只读取 CCM 自己保存的 API 地址、模型和密钥。CC-Switch 当前启用的 Claude Provider 不会出现在页面，也不会自动进入 CCM 启动的项目 Agent 环境。

## 当前流程

1. CCM 以只读方式读取 `~/.cc-switch/settings.json` 中的 `currentProviderClaude`。
2. CCM 从 `~/.cc-switch/cc-switch.db` 精确读取该 Claude Provider 的环境配置。
3. 若 CC-Switch 数据库不可用，则回退读取当前 `~/.claude/settings.json`。
4. 页面展示 Provider 名称、Base URL、认证字段和模型。
5. 密钥不复制到 CCM、不写入 CCM 设置文件，也不返回浏览器。
6. 启动 Claude Code 项目 Agent、群聊项目子 Agent和“测试 Agent”时，后端才把有效配置加入该进程环境。

## 优先级

```text
CCM 手动完整配置
> CC-Switch 当前 Claude Provider（启用自动跟随时）
> 未配置
```

页面默认开启“自动跟随 CC-Switch 当前 Claude Provider”。用户可以关闭并保存，之后恢复为 CCM 手动配置模式。

## 安全

- CC-Switch SQLite 使用只读连接。
- API Key 和 Auth Token 只存在于后端进程内存及目标 Claude Code 子进程环境。
- 公共配置只返回 `hasKey`，不会返回密钥值。
- 外部凭据不会被 CCM 的“保存并应用”复制一份。
- CCM 手动凭据仍使用原有 AES-256-GCM 凭据仓库。

## 验证

- 本机真实检测到 CC-Switch 当前 Claude Provider，并确认 URL、Key、模型齐全；输出未包含密钥。
- `npm run check`：通过。
- `npm run build:frontend`、`npm run build:backend`：通过。
- `node scripts/agent-provider-settings-selftest.mjs`：包含外部同步、关闭同步、手动覆盖、密钥不泄露和运行环境注入测试。
- `node scripts/agent-provider-account-model-render-selftest.mjs`：4 项通过，0 个页面错误。
- `npm run test:release -- --no-build`：5/5 通过；隔离安装、CLI 生命周期、跨平台 PTY 与降级路径均通过。
- 截图：[desktop-claude-cc-switch-sync.png](evidence/desktop-claude-cc-switch-sync.png)

自动测试使用本地假 CLI，没有付费 Provider 调用。

## 发布状态

- 本地包版本已准备为 `1.0.24`。
- 2026-07-23 按用户要求暂不执行 `npm publish`，等待下一批更新合并发布。
