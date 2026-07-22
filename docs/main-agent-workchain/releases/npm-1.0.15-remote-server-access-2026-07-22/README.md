# npm 1.0.15 远程服务器访问

## 目标

让安装在 Linux 或云服务器上的 CCM 可以明确、安全地提供局域网或公网入口，不再把 `localhost` 误认为其他设备可访问的地址。

## 行为

- 默认监听 `127.0.0.1:3080`，仅服务器本机可以访问。
- `ccm start --host 0.0.0.0 --port 3080` 显式监听所有 IPv4 网卡。
- `CCM_HOST=0.0.0.0` 可作为服务管理器的等价环境变量。
- `ccm status --json` 返回真实 `host`、`localUrl`、`remoteUrls` 和首选 `url`。
- 启动输出同时展示监听地址、本机地址和可发现的局域网地址。
- 服务锁保存 `listen_host`，后台 CLI 不再猜测服务的监听范围。

## 安全边界

- 浏览器 API 继续要求同源且具有有效 `ccm_session`。
- 无 Cookie 的 Agent/API 调用只信任真实回环连接。
- 请求来自非回环地址时必须登录；本机反向代理传入远程 `X-Forwarded-For` 时也必须登录。
- `/api/auth/session`、登录和首次安装注册入口仍可公开访问，以便远程用户完成登录。
- 公网使用应通过 HTTPS 反向代理，不能把 HTTP 登录凭据直接暴露在互联网中。

## 使用

直接开放局域网端口：

```bash
ccm start --background --host 0.0.0.0 --port 3080
ccm status
```

浏览器访问：

```text
http://服务器IP:3080
```

还需要放行主机防火墙和云安全组的 TCP `3080`。若使用 Nginx/Caddy 提供 HTTPS，CCM 应继续监听 `127.0.0.1`，由反向代理转发。

## 验证

- CLI 回归验证默认回环监听、`--host 0.0.0.0`、服务锁和状态输出。
- 本地鉴权回归验证本机 Agent 免登录、模拟远程无会话拒绝、远程有效会话放行。
- 后端与前端 production build。
- npm 安装包生命周期和核心 API 回归使用 mock/本地数据，付费 Provider 调用为 `0`。

## 发布结果

- 包：`@mumulinya167/cc-web@1.0.15`
- dist-tag：`latest -> 1.0.15`
- 官方 tarball：`https://registry.npmjs.org/@mumulinya167/cc-web/-/cc-web-1.0.15.tgz`
- SHA-1：`53249c4ab427171111862521e2784829f2aa7eee`
- Registry tarball 中 `ccm.js`、`legacy-project-cli.js`、`postinstall.js` 和 `setup.js` 均为 Linux `0755`。
