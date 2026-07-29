# 已确认项目结构与业务流程

本目录集中保存 CCM 已经由用户确认的项目结构、模块边界和业务流程。

这里的文档是当前产品口径，不用于记录临时方案、实施阶段、测试流水或尚未确认的设想。后续确认新的核心模块时，在本目录新增独立 Markdown 文档，并同步修正受影响的既有文档，避免同一业务保留相互冲突的说明。

## 当前文档

- [项目结构与业务流程覆盖矩阵](./PROJECT-COVERAGE-MATRIX.md)：生产代码、页面、API、CLI与确认文档的全量对应关系。
- [本地认证与访问安全](./LOCAL-AUTH-AND-SECURITY.md)：首次安装、注册、登录、Cookie会话、密码修改和访问门禁。
- [全局 Agent运行体系](./GLOBAL-AGENT-OPERATIONS.md)：普通问答、工具调用、Global Mission、运行监督和精确来源回传。
- [记忆系统](./MEMORY-SYSTEM.md)：全局 Agent、群聊主 Agent、独立项目 Agent、群聊项目子 Agent的单会话记忆，以及无会话列表的音乐 Agent 单例记忆、长期记忆、压缩、MCP 读取和受控写回流程。
- [知识库使用系统](./KNOWLEDGE-SYSTEM.md)：知识文档如何按全局、群聊、项目和 Agent 作用域被自动召回，第三方 Agent 如何通过 MCP 深读，以及 Embedding 缺失时的本地检索流程。
- [音乐意图与播放](./MUSIC-PLAYBACK.md)：全局 Agent 与音乐 Agent 如何理解精确点歌、歌手、心情、场景、曲风和随机播放请求，并共用唯一播放器。
- [开发 Agent 认证与运行时](./DEVELOPMENT-AGENT-AUTH.md)：Codex、Cursor、Gemini CLI、OpenCode和Claude Code的安装、认证证据、模型目录与统一派发边界。
- [TestAgent 智能独立验收](./TEST-AGENT.md)：TestAgent 如何自主读码、选择命令和 Playwright 检查，并由确定性证据门禁给出最终验收结论。
- [开发权限分级审批](./TASK-PERMISSION-APPROVAL.md)：项目子 Agent 如何申请额外权限、群聊主 Agent 如何审批、何时升级用户，以及限时租约如何消费和审计。
- [飞书全局与项目 Agent 双向会话](./FEISHU-GLOBAL-AGENT.md)：飞书消息如何进入精确全局或项目会话、回复如何返回原会话，以及权限如何在飞书中确认。
- [项目管理与运行](./PROJECT-MANAGEMENT.md)：稳定项目 ID、可编辑显示名称、Agent 连接与源码运行边界，以及多模块运行配置。
- [自动开发业务流程](./AUTOMATIC-DEVELOPMENT.md)：任务派发、工作台、全局 Agent和会话入口如何共用模型拆分、精确会话队列、TestAgent返工与任务回放。
- [MCP 与 Skill 作用域授权](./TOOL-AUTHORIZATION.md)：群聊、项目和全局 Agent如何独立授权、向模型展示并真实调用 MCP/Skill，以及缺失和越权时的失败策略。
- [需求资料摄取与附件](./REQUIREMENT-INGESTION-AND-ATTACHMENTS.md)：业务描述、图片、文件和公开在线文档如何进入统一任务链。
- [定时开发与工作报告](./SCHEDULING-AND-WORK-REPORTS.md)：项目/群聊Cron、需求池认领、恢复重试、日报和周报。
- [项目代码工作区与Git协作](./PROJECT-CODE-WORKSPACE.md)：仓库配置、变更树、提交、拉取、推送和部分成功语义。
- [终端与项目运行控制台](./TERMINAL-AND-RUNTIME-CONSOLE.md)：持久PTY、危险命令确认、源码运行、工具链和日志。
- [可靠性、性能监控与清理中心](./RELIABILITY-OBSERVABILITY-AND-CLEANUP.md)：指标、Trace、幂等租约、稳定性运行和预览式清理。
- [会话搜索与任务回放](./CONVERSATION-SEARCH-AND-TASK-REPLAY.md)：全局/群聊/项目会话搜索、精确跳转和验收回放。
- [模板、斜杠命令与共享文件](./TEMPLATES-SLASH-COMMANDS-AND-SHARED-FILES.md)：输入辅助、确定性命令和作用域文件共享。
- [MCP/Skill工具市场](./TOOL-MARKETPLACE-AND-CATALOG.md)：来源验证、安装预览、目录revision、授权影响和重同步。
- [桌面宠物与用户通知](./DESKTOP-PET-AND-USER-NOTIFICATIONS.md)：多Agent活动投影、权限提示、飞书反馈和资源安全。
- [工作台与菜单管理](./WORKSPACE-NAVIGATION-AND-MENU.md)：统一入口、页面加载、菜单分组和本地偏好。
- [npm安装、CLI与服务生命周期](./CLI-INSTALLATION-AND-SERVICE.md)：安装降级、启动停止、网络监听和进程清理。
- [音乐媒体库与播放平台](./MUSIC-LIBRARY-AND-MEDIA.md)：统一搜索、下载、歌单、历史、歌词、失败恢复和AI开关。
- [全链路模型语义路由](../main-agent-workchain/shared-workchain/model-semantic-routing-alignment-2026-07-23/README.md)：自然语言工作流与 Skill 由模型选择，代码仅承担校验、权限和执行门禁。
