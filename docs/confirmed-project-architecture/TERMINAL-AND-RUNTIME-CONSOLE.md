# 终端与项目运行控制台

## 两个独立运行域

- 内置终端用于用户交互式 Shell、项目命令和临时诊断。
- 项目运行管理器用于已保存的源码运行配置。它与“连接 Agent”完全分离。

## 内置终端

- 支持 PowerShell、CMD及系统可用 Shell，支持持久 PTY 会话、输入、尺寸调整、事件回放和停止。
- 页面关闭后服务端按会话状态管理终端；服务停止时统一终止所有受管进程。
- `node-pty`不可用时返回能力降级状态，不在 npm 安装阶段强制编译失败。
- 高风险命令先进入确认状态；确认前不写入 PTY。
- 工作目录必须来自已登记项目或安全浏览结果，禁止目录越界。

## 项目运行

- 运行配置来自真实 `package.json`、Maven、Gradle、Go、Rust或.NET配置，也允许用户手动配置。
- Java/Spring Boot默认运行源码任务（如 `spring-boot:run` 或 `bootRun`），构建操作才生成 JAR。
- JDK、Maven和Gradle可使用系统探测结果或项目配置；不会每次运行都下载工具链。
- 每个项目和运行配置独立管理 start、stop、restart、build、PID、日志和产物。
- 项目断开或服务关闭时可以显式停止该项目全部受管运行进程；无法证明 PID 归属时标记 unknown，不误杀。

## 日志

- 运行日志和构建日志分开保存、流式推送并限制体积。
- 控制台支持搜索、拖动高度、自动跟随、停止跟随和读取历史日志。
- 环境变量和命令输出经过敏感信息清理后再进入页面。

## 实现入口

- `backend/modules/tools/terminal.ts`
- `backend/modules/projects/project-runtime.ts`
- `frontend/src/components/tools/Terminal.vue`
- `frontend/src/components/projects/ProjectRunConsole.vue`
