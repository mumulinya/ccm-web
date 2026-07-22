# 登录页主题系统

Date: 2026-07-22

## 主题

登录页支持三种真实主题：

- `command`：星舰控制台，使用科幻工作区背景和深色青蓝表单；
- `minimal`：极简暗色，不加载背景图，使用安静的网格暗色界面；
- `light`：明亮工作台，使用浅色面板、深色文字和低对比背景。

主题只是认证入口的视觉外观，不改变账户、注册、Token、会话或 Agent 记忆。

## 使用流程

- 未登录用户可以通过右上角主题菜单即时切换。
- 用户选择写入浏览器 `localStorage` 的 `ccm:auth:theme`，刷新后继续使用。
- 管理员可以在“系统设置 -> 账户与安全 -> 登录页外观”设置服务端默认主题。
- 服务端默认主题保存于 `.cc-connect/auth/users.json` 的 `loginTheme`，通过公开会话状态接口提供给登录页。
- 当前浏览器有明确选择时优先使用本地选择；没有本地选择时使用管理员默认主题。

## 真实交互增强

- 注册模式根据长度、大小写、数字和符号显示四级密码强度；
- 密码输入期间检测 Caps Lock；
- 浏览器离线时显示真实离线状态并禁止提交；
- `prefers-reduced-motion` 下关闭非必要过渡；
- 三套主题分别处理普通、聚焦和 Chromium 自动填充输入样式。

没有增加 SSO、第三方登录、记住我、忘记密码或其他无后端能力的按钮。

## API

`GET /api/auth/session`、登录和注册响应增加：

```json
{ "login_theme": "command" }
```

管理员通过 `PUT /api/auth/settings` 提交：

```json
{ "login_theme": "minimal" }
```

主题值严格限制为 `command`、`minimal`、`light`。仅更新主题不会修改注册开关。

## 验证

```text
npm run test:local-auth
npm run build:frontend
```

Playwright 验证三套主题切换、刷新持久化、背景策略、输入文字颜色和页面无横向溢出。认证回归验证默认主题落盘、非法主题拒绝以及主题更新不改变注册策略。
