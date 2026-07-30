# npm 安装、CLI 与服务生命周期

## 安装结构

- npm包提供 `ccm` 命令、编译后的后端、前端资源、MCP运行时和必要清单。
- 官方文件系统MCP随核心依赖安装并使用`shell:false`直接启动；首次运行不依赖`npx`下载，旧官方配置受控迁移且不覆盖用户自定义工具。
- `node-pty`是可选依赖；缺少编译工具时安装仍可完成，终端降级而不是整个CCM不可用。
- 本地Embedding模型不打入npm包；首次 `ccm start` 在后台准备并校验模型，失败时知识检索降级为词面模式。
- 默认月薪喵随核心包离线提供；其他官方宠物由同版本`@mumulinya167/ccm-pet-assets`在首次选择时按需下载和校验。
- 核心产物强制满足20MB压缩、35MB解压和700文件预算，发布与测试使用同一份构建证明tarball。

## CLI

- `ccm start`：启动服务，可指定host、port、后台和打开浏览器。
- `ccm start --public-origin https://example.com`：显式授权反向代理公网域名。
- `ccm setup-code`：显示24小时首次安装码；`--rotate`仅在没有用户时轮换。
- `ccm stop/restart/status/open/logs/doctor`：管理服务、查看日志和本地依赖状态。
- `ccm project connect/disconnect`：管理项目Agent连接。
- `ccm project runtime start/stop/restart/build --profile <id>`：运行或构建精确源码配置。
- `ccm project list/start/stop`：保留兼容映射并显示弃用提示。
- `ccm pet`：控制桌面宠物。
- `ccm update --check`和`ccm update`：检查或安装npm最新版本。

## 服务关闭

1. 使用锁、进程指纹和HMAC身份接口证明当前实例归属，再进入`draining`。
2. 停止接受新修改请求并立即关闭HTTP接入。
3. 通知项目运行管理器停止受管源码进程。
4. 停止终端、Agent、飞书监督器、定时调度和后台监控。
5. 写入生命周期终态、关闭SQLite后才释放实例锁。
6. 无法证明归属的外部进程不被误杀。

## 事务更新

- 更新先固定精确版本与registry integrity，再在隔离prefix中安装、执行doctor及启动/停止烟雾验证。
- 验证成功后按原host、port、public origin和启动模式短暂停机切换。
- 新版本健康检查失败会自动恢复旧精确版本；双重失败进入`recovery_required`并保留恢复证据。
- `ccm update --status | --prepare | --switch | --rollback`可查询和恢复持久更新事务。

## 网络边界

- 默认host为本机地址；外部服务器访问需要显式监听公网网卡，并由用户配置防火墙或反向代理。
- 浏览器认证、Host白名单和RBAC始终生效，开放端口不等于匿名访问。
- 状态文件、日志和模型缓存位于用户的 `.cc-connect` 数据目录，不写入安装包目录。

## 实现入口

- `ccm-package/bin/ccm.js`
- `ccm-package/bin/postinstall.js`
- `backend/system/process-lifecycle.ts`
- `backend/core/server-instance-lock.ts`
- `ccm-package/bin/service-runtime.js`
- `ccm-package/bin/update-runtime.js`
- 完整流程：[npm安装、CLI与服务生命周期](../confirmed-business-processes/NPM-CLI-SERVICE-LIFECYCLE.md)
- 回归：`cli-service-lifecycle-v2-selftest.mjs`、`package-update-transaction-selftest.mjs`、`pet-asset-delivery-selftest.mjs`、`npm-package-install-release-selftest.mjs`。
