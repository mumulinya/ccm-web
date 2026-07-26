# 开发 Agent 可用性测试

## 行为

开发 Agent 设置页为已经安装且已登录的 Codex、Cursor、Gemini CLI 和 OpenCode 显示“测试”按钮。Claude Code API 在配置完整后显示“测试 Agent”。

测试使用页面当前选择的模型发起一次固定的最小请求。只有进程成功退出并返回 `CCM_AGENT_OK`，CCM 才会判定 Agent 可以使用。结果展示：

- 是否可用。
- 响应耗时。
- 测试使用的模型。
- 安全裁剪后的失败原因。

## 安全边界

- 测试由用户点击触发，不自动运行。
- Codex 使用只读沙箱；Cursor 使用 ask 模式；Claude Code 使用 plan 模式。
- 固定提示明确禁止读取文件、调用工具或修改内容。
- 不加载项目会话、群聊记忆、MCP、Skill 或共享文件。
- 同一个 Provider 同时只允许一个测试进程。
- 90 秒没有完成会终止整个测试进程树。
- 模型 ID 使用严格字符校验，防止命令参数注入。
- API 不返回 stdout、stderr 或 Provider 原始响应，只返回安全状态摘要。

测试会产生一次很小的真实 Provider 请求，因此页面按钮提示中明确说明“可能产生少量 Provider 用量”。

## 验证

- `npm run check`：通过。
- `npm run build:frontend`、`npm run build:backend`：通过。
- `node scripts/agent-provider-settings-selftest.mjs`：12 项通过；实际执行使用本地假 Codex CLI，付费调用为 0。
- `node scripts/agent-provider-account-model-render-selftest.mjs`：3 项浏览器回归通过，0 个页面错误。
- 截图：[desktop-agent-test-result.png](evidence/desktop-agent-test-result.png)
- npm release 回归 5/5 通过，已发布 `@mumulinya167/cc-web@1.0.23`，`latest` 已核验为 `1.0.23`。
