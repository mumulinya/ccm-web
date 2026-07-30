# npm安装、CLI与服务生命周期完整链路

## 1. 用户入口

- 安装：`npm install -g @mumulinya167/cc-web@<精确版本>`。
- 启动：`ccm start`，可增加`--background`、`--host`、`--port`和`--public-origin`。
- 管理：`ccm status | doctor | logs | stop | restart`。
- 更新：`ccm update`，或使用`--check | --prepare | --switch | --status | --rollback`分步控制。
- 项目连接：`ccm project connect | disconnect`。
- 项目源码运行：`ccm project runtime start | stop | restart | build --profile <id>`。

## 2. 可信安装产物

发布构建只从`ccm-package/package.json`读取核心版本，并要求可选宠物资源包使用同一版本。构建先清空后端与前端产物，再生成一次带短期构建证明的tarball。

核心包包含CLI、后端、前端、MCP、内部Skill、默认月薪喵和最小网页宠物资源，不包含本地Embedding模型及其他宠物。产物强制满足：

- 压缩后不超过20MB。
- 解压后不超过35MB。
- 文件数不超过700。
- 不包含`file:`、`link:`、`workspace:`依赖或异常软链接。

官方`filesystem-mcp`作为核心包的固定版本依赖安装，启动时由当前Node进程直接执行，不再通过`npx`联网解析。升级时只迁移带`ccm-official`来源证明的旧定义，用户自定义同名MCP保持原样。
- CLI入口在tarball中保持`0755`。

同版本`@mumulinya167/ccm-pet-assets`单独生成带checksum清单的资源包。用户首次选择Clawd、小云朵、三花猫、小幽灵或机器人时，CCM在隔离目录下载、逐文件校验并原子启用。离线、下载失败或checksum错误不会影响CCM启动，也不会覆盖当前皮肤。

`postinstall`只修复CLI执行权限并显示环境信息，不下载模型、宠物、Python、CUDA或系统依赖。约118MB本地Embedding模型在首次`ccm start`就绪后后台准备，不阻塞服务开放。

## 3. 服务身份与启动

启动使用`ServiceInstanceIdentityV2`绑定：

- 实例ID、PID和进程启动指纹。
- 服务入口checksum和运行版本。
- 数据目录、host、port、public origin及启动模式。
- 当前主机和启动时间。

并发启动先竞争跨进程实例锁。CLI必须同时核验锁文件、进程指纹和HMAC保护的`identity/ready`接口；端口可连接、PID存在或进程名称相同均不能证明服务属于CCM。

端口被其他程序占用时返回`port_in_use`和非零退出码。存活进程与锁身份不一致时返回`ownership_unproven`，不会结束该进程。只有子进程未退出、签名身份完全一致且就绪接口通过后，CLI才打印`STARTED`。

成功启动会保存`ServiceLaunchConfigurationV2`。`restart`和更新切换默认恢复原host、port、public origin与前后台模式，只有显式CLI参数可以覆盖。

## 4. 排空式停止

`ccm stop`只处理经过三重身份核验的实例：

1. 调用HMAC内部接口将服务切换到`draining`。
2. 拒绝新的修改请求和任务认领，并关闭HTTP接入。
3. 停止Cron、任务看门狗、恢复器和通知调度。
4. 有界停止当前实例拥有的项目源码进程、构建进程与终端进程树。
5. 写入进程生命周期终态，关闭SQLite和日志。
6. 最后释放实例锁并退出。

Windows按已核验PID结束进程树；Linux/macOS使用独立进程组，先`SIGTERM`，超时后再强制停止。无法证明归属的子进程保留为阻塞证据，不能按进程名误杀。

未处理Promise会先写入脱敏故障，再进入同一受控排空并以非零状态退出，异常进程不会继续提供服务。

## 5. 事务化更新

更新状态为：

```text
checking
→ downloading
→ verifying
→ staged
→ switching
→ validating
→ completed | rolled_back | recovery_required
```

CCM先固定registry中的精确版本和SHA-512 integrity，将tarball下载到带CCM所有权标记的暂存目录。随后在隔离prefix与独立数据目录中执行：

- 包名、版本、依赖、脚本、链接和CLI权限校验。
- `ccm doctor`。
- 隔离后台启动、签名身份核验和受控停止。

只有隔离验证全部通过才排空旧服务并安装已验证的精确tarball。新版本健康检查失败时自动安装旧精确版本，并使用原启动配置恢复服务。回滚也失败时进入`recovery_required`，保留新旧产物与诊断证据，`ccm doctor`和`ccm update --status`给出恢复动作。

任何成功提示都以持久事务终态为准，页面和CLI不会因重复轮询持续显示“更新完成”。

## 6. 项目命令语义

项目Agent连接与项目源码运行是两条独立链：

- `connect/disconnect`管理项目Agent协作通道。
- `runtime start/stop/restart/build`管理精确运行配置。

Java/Spring Boot启动使用Maven`spring-boot:run`或Gradle`bootRun/run`直接运行源码。`build`才生成JAR；运行操作不会先打JAR再启动。旧`ccm start/stop <project>`仅作兼容映射并显示弃用提示。

## 7. 日志与故障恢复

后台主日志单文件10MB、保留5份；`ccm logs`从文件尾部有界读取，`--follow`只读取增量。生命周期终态和更新事务另有有界审计记录。

服务启动时恢复失效租约、未完成停止与更新状态。旧V1锁和PID只作只读兼容；仅在能够证明进程已经不存在时归档，绝不根据旧PID结束存活进程。

## 8. 实现与验证

实现入口：

- `ccm-package/bin/ccm.js`
- `ccm-package/bin/service-runtime.js`
- `ccm-package/bin/update-runtime.js`
- `backend/core/server-instance-lock.ts`
- `backend/system/process-lifecycle.ts`
- `backend/modules/pets/pet-asset-pack.ts`
- `scripts/build-release-artifact.mjs`

自动化门禁：

- `cli-service-lifecycle-v2-selftest.mjs`
- `package-update-transaction-selftest.mjs`
- `pet-asset-delivery-selftest.mjs`
- `npm-package-install-release-selftest.mjs`
- `node-pty-cross-platform-release-selftest.mjs`
- `node-pty-degraded-runtime-selftest.mjs`
- `release-acceptance-framework-selftest.mjs`

回归使用隔离数据目录和Mock，不调用付费Provider。发布流水线在Windows/Linux及Node 20/22使用同一份已证明tarball完成安装、启动、认证、停止和降级验证。
