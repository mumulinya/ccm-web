# 内置终端与项目运行控制台完整链路

## 业务边界

CCM存在两个独立运行域：

```text
Admin打开内置终端
→ 创建持久PTY或使用降级命令执行器
→ 实时输入、输出与窗口调整
→ 停止时终止完整进程树

用户选择项目运行配置
→ 核验项目、模块和命令
→ 原子领取精确配置运行权
→ 直接运行源码或执行构建
→ 实时日志、状态与产物回执
→ 暂停、重启、断开或服务关闭时受控停止
```

“连接/断开 Agent”管理项目协作通道；“启动/暂停/重新运行/构建”管理源码进程。Java与Spring Boot启动使用`spring-boot:run`、`bootRun`或`run`直接运行源码，只有构建操作生成JAR。

## 内置终端

- 持久终端使用PTY，保留精确工作目录、Shell、尺寸、输出序列和进程身份。浏览器输入先短暂合批，页面卸载前强制刷新剩余输入。
- PTY不可用时显式降级为单次命令执行器。命令通过异步子进程执行，具有超时、取消、5 MB输出上限和真实退出码，不阻塞Node事件循环。
- 持久Shell只向Admin开放，并明确属于不受限本地Shell。降级执行器对危险命令发出60秒、一次性确认challenge；确认只绑定该命令和工作目录。
- 端口与进程清单异步读取、Singleflight并短期缓存，不使用同步系统命令阻塞请求。
- 客户端断开、用户停止或服务关闭时，Windows使用`taskkill /T`并在超时后`/F`，Linux/macOS使用独立进程组`SIGTERM`并在超时后`SIGKILL`。只有根进程消失后才返回停止成功。

## 项目源码运行

- 运行配置绑定内部项目ID、配置ID、模块目录、项目类型、环境和命令checksum。命令只能在项目目录内执行，禁止目录越界、Shell拼接和未允许的执行程序。
- 同一精确配置的start、stop、restart和build通过进程内Singleflight与跨进程文件锁串行。占用时返回`423 repository_busy`式明确状态，不重复启动。
- 状态依次记录`starting/running/stopping/stopped/unknown/failed`；构建记录独立状态。停止先持久化`stopping`，完成进程树核验后才写`stopped`，无法证明时写`unknown`并禁止假成功。
- 重启必须先取得停止成功回执，再用相同配置创建新进程。用户主动暂停不计为运行失败。
- 显式断开项目Agent会同时停止该项目全部受管源码进程与构建任务；通道或任一运行进程未成功停止时接口返回失败，不显示“已断开”。
- CCM正常关闭会等待终端和项目进程的停止事务；异常重启后只恢复可证明归属的状态，不能证明的PID标记`unknown`且不误杀。

## 日志与页面恢复

- 运行日志和构建日志分文件保存；输出先脱敏，再通过串行异步写队列落盘，不在高频输出回调中同步读写整个日志文件。
- 日志隐藏Bearer、API Key、密码、含凭据URL、私钥块和常见云密钥；写入失败进入`log_failures`状态，不伪装为完整日志。
- SSE实时发送reset/chunk/status，慢客户端积压超过上限会断开。重新连接后通过最多1 MB的尾部快照恢复，再继续实时流。
- 前端的项目、配置、日志和工具链请求都绑定AbortController与请求generation；切换项目后旧响应及旧`finally`不能覆盖新页面。
- 控制台支持ANSI、搜索、复制、暂停跟随、清空视图、停止与重新运行，并支持拖动高度、双击复位和键盘调整。

## 权限与审计

- Viewer和Operator不能打开持久终端；Admin才能使用本机交互式Shell。
- 项目运行沿现有RBAC：页面精确按钮操作按当前能力执行；全局Agent或飞书发起运行继续经过高风险权限门禁。
- API和页面不记录原始终端命令；状态只保留进程、工作目录、时间、退出码、停止回执与脱敏错误。
- 项目运行PID、项目Agent PID和终端PID分别管理，任何停止操作都不能影响兄弟项目或其他配置。

## 失败处理

- 超时、取消、浏览器关闭和服务关闭都必须进入同一进程树终止器。
- 终止失败返回可核验错误并保留`running/unknown`事实，不删除进程归属证据后宣称成功。
- 日志SSE断开不停止源码进程；页面可用快照恢复。
- PTY本机扩展缺失不影响CCM启动，页面明确使用降级命令模式。

## 实现与验证

主要实现：

- `backend/system/managed-process-tree.ts`
- `backend/modules/tools/terminal.ts`
- `backend/modules/tools/tools.ts`
- `backend/modules/projects/project-runtime.ts`
- `backend/modules/projects/projects.ts`
- `frontend/src/components/tools/Terminal.vue`
- `frontend/src/components/tools/terminal/TerminalEmulatorPane.vue`
- `frontend/src/components/projects/ProjectRunConsole.vue`
- `frontend/src/components/projects/ProjectRuntimeBar.vue`

自动化回归覆盖异步终端、超时与强制进程树停止、PTY生命周期、危险命令challenge、node-pty降级、Spring Boot源码运行、多配置并行、精确停止、重启新PID、真实构建产物、Java工具链、日志恢复、请求generation和控制台尺寸。全部测试使用本地进程，付费Provider调用为`0`。
