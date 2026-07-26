# 项目显示名称与源码运行工作台

## 当前行为

项目页面现在明确分离两类生命周期：

- `连接 Agent` / `断开 Agent`：启动或停止原有 cc-connect 项目会话与飞书协作通道。
- `启动` / `暂停` / `重新运行` / `构建`：执行项目源码的运行配置。

项目内部 ID 继续绑定配置文件、单项目会话、任务、记忆、群聊成员和飞书凭据。用户在编辑项目中修改的是 `display_name`，不会迁移或重写上述数据。

## 运行配置

创建项目后执行一次配置扫描，用户也可以在运行配置窗口手动重新扫描。当前探测来源包括：

- Node 项目的 `package.json`，按锁文件选择 npm、pnpm、yarn 或 bun，并配对 `dev/start/serve/preview` 与 `build` 的环境变体。
- Maven 父工程和子模块，优先使用 Wrapper，Spring Boot 模块提供运行命令，聚合工程和模块提供 `package`。
- Gradle 工程及子模块，识别 `bootRun/run/build`。

Spring Boot 的后续多模块、默认配置与 Windows 工具链增强见 [Spring Boot 项目运行支持](../spring-boot-runtime-support-2026-07-24/README.md)。
- Go、Rust 和 .NET 的保守标准命令。

Python 和无法证明入口的工程不猜测命令。扫描最多进入三级目录，并排除依赖、构建产物和版本控制目录。重新扫描按照稳定配置 ID 合并，保留用户修改，已经消失的配置只标记失效。

## 进程与构建

- 每个 `project ID + profile ID` 拥有独立进程、运行日志和构建日志，前后端与多个服务可以并行。
- 暂停会结束精确进程树并保留配置；重新运行先暂停旧进程再创建新进程。
- Agent PID 与源码 PID 分开保存，旧 `/api/start` 和 `/api/stop` 仍只管理 Agent 连接。
- CCM 重启后只恢复可验证状态；仍存活但无法证明归属的 PID 标记为 `unknown`，停止操作 fail closed。
- 构建异步执行，Java 返回实际 JAR，前端返回真实输出目录；页面通过 Runtime SSE 刷新状态。
- 归档项目以前必须停止 Agent、所有源码进程和构建任务。

## 接口

- `GET /api/projects/runtime`
- `POST /api/projects/runtime/rescan`
- `POST /api/projects/runtime/config`
- `POST /api/projects/runtime/action`
- `GET /api/projects/runtime/logs`
- `POST /api/projects/agent-connection`

项目列表同时返回 `display_name`、`agent_connection` 和 `runtime_summary`。旧 `running/pid` 字段继续代表 Agent 连接，供旧客户端兼容。

## 全局与飞书

全局 Agent 和飞书中的“启动、暂停、重新运行、构建项目”调用源码运行接口；“连接/断开项目 Agent”调用协作连接接口。运行操作继续走高风险确认。多个配置没有默认项时禁止猜测，要求用户指定配置。

## 验证证据

- `npm run build:backend`
- `npm run build:frontend`
- `node scripts/project-runtime-workbench-selftest.mjs`
- `CCM_BASE_URL=http://127.0.0.1:3080 node scripts/project-management-render-regression.mjs`

自测覆盖环境脚本配对、子模块探测、显示名称稳定性、两个源码进程并行、重复启动拦截、精确暂停、重启新 PID、真实构建产物、API/UI 接线和全局/飞书语义。测试使用本地临时 Node 进程，付费 Provider 调用为 0。
