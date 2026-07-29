# npm 安装、CLI 与服务生命周期

## 安装结构

- npm包提供 `ccm` 命令、编译后的后端、前端资源、MCP运行时和必要清单。
- `node-pty`是可选依赖；缺少编译工具时安装仍可完成，终端降级而不是整个CCM不可用。
- 本地Embedding模型不打入npm包；首次 `ccm start` 在后台准备并校验模型，失败时知识检索降级为词面模式。

## CLI

- `ccm start`：启动服务，可指定host、port、后台和打开浏览器。
- `ccm start --public-origin https://example.com`：显式授权反向代理公网域名。
- `ccm setup-code`：显示24小时首次安装码；`--rotate`仅在没有用户时轮换。
- `ccm stop/restart/status/open/logs/doctor`：管理服务、查看日志和本地依赖状态。
- `ccm project list/start/stop`：保留项目兼容命令；页面源码运行使用项目运行管理器。
- `ccm pet`：控制桌面宠物。
- `ccm update --check`和`ccm update`：检查或安装npm最新版本。

## 服务关闭

1. 停止接受新请求。
2. 通知项目运行管理器停止受管源码进程。
3. 停止终端、Agent、飞书监督器、定时调度和后台监控。
4. 等待有界清理后写入服务状态并退出。
5. 无法证明归属的外部进程不被误杀。

## 网络边界

- 默认host为本机地址；外部服务器访问需要显式监听公网网卡，并由用户配置防火墙或反向代理。
- 浏览器认证、Host白名单和RBAC始终生效，开放端口不等于匿名访问。
- 状态文件、日志和模型缓存位于用户的 `.cc-connect` 数据目录，不写入安装包目录。

## 实现入口

- `ccm-package/bin/ccm.js`
- `ccm-package/bin/postinstall.js`
- `backend/system/process-lifecycle.ts`
- 回归：`cli-release-selftest.mjs`、`node-pty-degraded-runtime-selftest.mjs`、`npm-package-install-release-selftest.mjs`。
