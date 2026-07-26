# 开发 Agent 统一浏览器认证

## 当前结论

Codex、Cursor Agent、Gemini CLI 和 OpenCode 的登录入口统一为浏览器认证会话。用户点击“登录”后，CCM 立即弹出浏览器等待页，后台 CLI 生成一次性授权地址后自动跳转，不再要求用户先进入独立终端。

Claude Code 继续使用用户配置的 Anthropic 兼容第三方 API，不伪装成账号网页登录。

## 业务流程

1. 设置页在用户点击事件中同步创建浏览器弹窗，避免异步请求触发浏览器弹窗拦截。
2. 后端按精确 Provider 创建十分钟有效的认证会话并启动官方 CLI 登录流程。
3. CCM 只解析和返回白名单 HTTPS 授权地址、设备码、阶段状态及可公开错误，不返回 CLI 原始输出、Token 或凭据。
4. 弹窗自动跳转到第三方官方授权页，设置页以会话 ID 轮询当前认证状态。
5. Codex 和 OpenCode 使用设备码流程；Cursor 使用 CLI 生成的一次性授权链接；Gemini 使用 Google OAuth 无浏览器流程。
6. Gemini 网页完成授权后会显示授权码，用户在设置页回填，后端仅把该码写入当前 Gemini 认证进程。
7. CLI 完成凭据写入后，设置页自动重新检查，并将状态切换为“已登录”。

动态模型列表只在 Cursor/OpenCode 已登录后读取，避免未认证 CLI 的同步探测阻塞登录请求；Cursor 状态探测上限由十二秒收紧为四秒。

## 远程服务器

浏览器始终由访问 CCM 的用户浏览器打开，而不是尝试打开 Linux 服务器桌面。CLI 和凭据仍运行、保存在 CCM 所在服务器，因此网页授权结果会正确绑定服务器上的 Agent。

## Provider 对应方式

- Codex：`codex login --device-auth`
- Cursor Agent：`cursor-agent login`，并通过 `NO_OPEN_BROWSER=1` 取得一次性地址
- Gemini CLI：Google OAuth，`NO_BROWSER=true`，支持授权码回填
- OpenCode：默认连接 OpenAI / ChatGPT 的 headless OAuth 方式
- Claude Code：第三方 API 地址、模型和加密密钥配置

## 失败策略

- URL 必须为 HTTPS，并匹配当前 Provider 的官方域名后缀。
- Provider、认证会话 ID 不匹配时拒绝读取或回填。
- 授权码限制长度并拒绝换行和空字符。
- 十分钟未完成则终止认证进程并要求重新发起。
- 浏览器阻止弹窗时，设置页保留“打开认证页”按钮；不会把未完成流程显示成已登录。

## 验证

- `npm run check`
- `npm run build`
- `node scripts/agent-provider-settings-selftest.mjs`
- `node scripts/agent-provider-browser-login-selftest.mjs`
- 测试使用 mock CLI，付费 Provider 调用为 `0`。
- Playwright 桌面验收确认弹窗跳转至模拟的 `https://auth.openai.com/codex/device`、设备码可见且页面无横向溢出；证据见 `browser-auth-desktop.png`。

## 替代关系

本实现替代 `development-agent-visible-login-launch-2026-07-23` 中的可见 PowerShell 终端方案。该旧文档只作为历史实施记录，不再代表当前登录行为。

## 发布结果

- 已于北京时间 `2026-07-23 15:06:03` 发布 `@mumulinya167/cc-web@1.0.20`。
- npm `latest` 已反查为 `1.0.20`。
- 公共 tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.20.tgz`
- SHA-1：`b705e5303c573a64aa1b4d9b4698b93b20f0ce56`
