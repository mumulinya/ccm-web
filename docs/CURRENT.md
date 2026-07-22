# CCM 当前状态

本文只记录当前可依赖的产品结构。详细协议和业务边界以 [确认项目结构](./confirmed-project-architecture/README.md) 为准，历史实现过程从 [归档索引](./archive/README.md) 查找。

## 核心工作链

- 全局 Agent 处理全局会话、拆分跨项目任务，并将业务任务派发到对应群聊；普通网页会话回复不会转发到飞书。
- 群聊主 Agent 绑定单个精确群聊会话，负责任务规划、项目子 Agent 调度、权限审批和最终验收。
- 独立项目 Agent 绑定单个精确项目会话；第三方 Agent 通过受签名约束的 MCP 快照读取正式会话上下文与项目长期记忆。
- TestAgent 独立复核交付证据，不直接替代主 Agent 的验收责任。

## 记忆与上下文

- 全局、群聊和项目会话分别维护独立 transcript、正式模型摘要、近期原文窗口和压缩边界。
- 未压缩会话使用完整历史；压缩后使用正式摘要加动态近期完整原文；后续压缩沿用上一代摘要形成连续链。
- 项目子 Agent 读取绑定会话、相关长期记忆、当前工作单及显式配置的 MCP、Skill 和共享文件，不允许跨 scope 读取。
- 本地规则摘要只能用于校验，不能成为 canonical summary；压缩失败时不推进边界。

## 权限与通道

- 读取类操作默认放行；写入、执行、网络、发布等风险操作进入分层权限审批。
- 项目会话由用户审批，群聊项目子 Agent 优先由群聊主 Agent 判断，无法判断时再请求用户。
- 飞书来源的全局任务在飞书中接收审批和结果；网页来源会话与飞书回复互不串线。

## 运行时更新

- `/api/runtime/events` 是任务、权限、Agent、飞书、项目、群聊和定时任务状态的统一 SSE 通道。
- 前端使用单例连接按事件定向刷新，断线时保留 60 秒低频兜底；旧工作台流接口继续兼容但不再固定 5 秒重算。
- SSE 事件只携带安全状态字段，不包含消息正文、附件、transcript 或密钥。

## 发布与跨平台

- 发布矩阵覆盖 Windows、Ubuntu 与 Node.js 20/22，并执行构建、CLI 生命周期、npm 安装包和终端能力回归。
- `node-pty` 作为可选原生能力：预编译模块可用时提供持久交互 Shell；不可用时应用和其他功能继续运行，终端切换为命令兼容模式。
- 五种开发 Agent 的发布验收分为无调用预检和显式 live 验收；live 结果只保存状态、版本、模型、输出 checksum 和工作目录 checksum，不保存模型原始回复。

实现和验收边界见 [跨平台安装与真实链路发布验收](./main-agent-workchain/releases/cross-platform-live-acceptance-2026-07-23/README.md)。

本地会话、数据库、凭据、运行日志和测试产物不会进入 Git；规则和保留边界见 [Git 本地数据与敏感产物隔离](./main-agent-workchain/security/git-local-data-hygiene-2026-07-23/README.md)。

## 验证入口

- 日常快速回归：`npm test`
- 指定领域：`npm run test:domain -- <domain>`
- 完整领域回归：`npm run test:all`
- 类型和生产构建：`npm run check`、`npm run build`
- 文档目录与链接：`npm run docs:check`
- 发布环境预检：`npm run release:preflight`

完整命令和领域清单见 [测试指南](./TESTING.md)。
