# IDEA 风格运行控制台与 Maven 自动恢复

Date: 2026-07-24

Status: Implemented and verified with a real Spring Boot project

## 用户流程

项目运行日志不再使用一次性静态文本框。用户从项目运行栏打开日志后，会进入同一个持续更新的控制台：

```text
启动目标模块
-> 通过 SSE 接收 stdout / stderr
-> 保留 ANSI 颜色、自动跟随、暂停输出、搜索和复制
-> 可从控制台停止或重新运行精确配置
-> 依赖准备、二次启动和应用日志保持在同一条时间线
```

控制台使用 xterm 渲染，支持运行日志和构建日志切换。后端先订阅再发送快照，避免打开控制台时漏掉快照与首个增量之间的日志。心跳只维持连接，不触发高频页面轮询。Windows Maven/Gradle 输出按 `GB18030` 解码，避免中文编译错误乱码。

控制台打开时先通过普通日志接口读取最多 2,000 行初始快照，再连接 SSE 获取重置与增量事件。即使浏览器错过第一条 SSE、连接恢复较慢或终端稍后完成尺寸初始化，也不会只显示空黑面板；加载、空日志和连接失败分别显示明确状态。

桌面端控制台作为项目工作区的独立底部面板；移动端固定在底部导航上方并占约半屏，终端正文在面板内滚动，不再落到长会话页面的视口之外。两种布局都不会产生页面横向溢出。

## Spring Boot 恢复

多模块 Maven 项目先精确执行目标模块：

```text
mvn -f <module>/pom.xml spring-boot:run
```

如果 Maven 明确报告项目内部 SNAPSHOT、父 POM 或 BOM 缺失，CCM 才进入受控恢复：

1. 使用 `-pl <module> -am install -Dmaven.test.skip=true` 准备 reactor 依赖。
2. 测试编译和测试执行只在启动前依赖准备阶段跳过；用户触发正式打包时仍使用配置的构建命令和测试策略。
3. 如果目标依赖了被根 `pom.xml` 排除但源码仍存在的本地模块，读取 Maven 的真实缺失坐标并定位仓库内 POM。
4. 本地恢复按父 POM/BOM 在前、普通 JAR 在后的顺序执行；`${revision}` 从根 POM 的受校验属性传入。
5. 本地模块安装后重跑 reactor，成功后再次启动目标 Spring Boot 模块。
6. 找不到本地模块、命令不安全、恢复步骤失败或重试后仍失败时 fail closed，并在同一控制台保留精确错误。

恢复不会修改项目 POM，不会自动放宽目录或命令安全边界，也不会把正式构建的测试门禁改成跳过测试。

## 状态与迁移

- `starting` 表示准备 reactor 或本地模块，不伪装成服务已经运行。
- `running` 表示目标进程正在运行；应用是否完成启动仍由真实日志展示。
- `stopReason` 区分用户停止、自然退出和 CCM 重启后的失联 PID。
- 运行状态保存 `managerPid`。CLI 或兄弟进程读取共享状态时，只要所属 CCM 服务和子进程都仍存在，就不会把它误标为 `unknown`。
- `ccm stop/restart` 在终止服务前调用本机运行时清理接口，先提交 `stopped/user` 状态并停止精确进程树。该步骤解决 Windows 无法可靠执行 Node `SIGTERM` 回调而遗留孤儿进程的问题。
- Windows Maven 进程不是单层子进程。停止事务从系统进程快照递归收集 `cmd -> Maven JVM -> Spring Boot JVM` 全部后代，并从最深层向上终止；即使根 CMD 已退出，仍可按保存的父 PID 清理占用端口的 JVM。
- 正常 CCM 重启后项目处于可再次启动状态；异常崩溃且无法证明 PID 归属时继续 fail closed。
- 当前 CCM 创建的短进程由自身 `close` 回调结算，页面刷新不会提前把自动恢复误判成用户停止。
- 探测器版本随恢复字段升级；旧项目在读取时惰性重扫，未修改的自动配置获得新准备命令，手动配置和用户改过的配置保持不变。

## 真实验收

真实项目：`nova-erp-server`

- 目标：`yudao-server · Spring Boot`
- 启动：`mvn -f yudao-server/pom.xml spring-boot:run`
- reactor 准备：`mvn -pl yudao-server -am install -Dmaven.test.skip=true`
- 首次失败：本地 `2026.03-SNAPSHOT` BOM 未安装。
- 第二层失败：`yudao-server` 依赖 `yudao-module-erp`，但根 POM 注释了该模块。
- CCM 自动安装 `yudao-dependencies` 和 `yudao-module-erp`，随后重跑 reactor 与目标模块。
- 最终日志：`Started YudaoServerApplication in 16.842 seconds`。
- Tomcat：`48080`。
- 验收结束后由测试脚本主动停止，最终状态为 `stopped`、`stopReason=user`、`exitCode=null`。

后续重启回归再次验证：源码运行状态为 `running` 时执行 `ccm restart`，结果为 `stopped/user`、旧根 PID 不存在且 `48080` 无监听；重新启动后输出 `Started YudaoServerApplication in 17.088 seconds`，最终保持运行状态。

## 验证

- `npm run check`
- `npm run build:backend`
- `node scripts/project-runtime-workbench-selftest.mjs`
- `npm run build`
- `npm run test:integrations -- --no-build`
- `npm run test:quick -- --no-build`
- `npm run docs:check`

自动测试使用本地夹具，付费 Provider 调用为 `0`。真实验收只运行本机 Maven 和用户已有源码。
