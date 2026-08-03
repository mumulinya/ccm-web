# 已确认业务流程实现

本目录记录 CCM 已经由用户确认、已经进入生产代码并通过回归验证的业务流程。

这里描述的是当前真实实现，不保存讨论草案、未来计划或仅有页面原型的能力。流程发生变化时，应直接更新对应文档，并保留实现入口、状态边界和验证证据，避免产品口径与代码脱节。

## 已确认流程

- [本地认证、RBAC与访问安全](./LOCAL-AUTH-RBAC-ACCESS-SECURITY.md)
- [开发 Agent 认证与可用性 V2](./DEVELOPMENT-AGENT-AUTHENTICATION-V2.md)

| 业务流程 | 当前状态 | 文档 |
| --- | --- | --- |
| 群聊项目子 Agent 跨项目协作 | 已实现、已启用签名与精确会话门禁 | [项目子 Agent 协作流程](./PROJECT-CHILD-AGENT-COLLABORATION.md) |
| 记忆系统端到端流程 | 已实现、已完成CC式压缩、长期记忆、MCP hydration与Context Engine闭环 | [记忆系统完整业务流程](./MEMORY-SYSTEM-END-TO-END.md) |
| 自动开发任务端到端流程 | 已记录全局Agent、任务派发、工作台、群聊/项目会话从需求摄取到开发、验收、回传、回放和记忆准入的完整链路 | [自动开发任务完整业务流程](./AUTOMATIC-DEVELOPMENT-END-TO-END.md) |
| 分级重试、任务中断与恢复 | 已记录四类模型重试档、停止与永久取消、子Agent会话保留、安全恢复和任务回放链路 | [分级重试、任务中断与会话恢复](./TASK-INTERRUPTION-AND-RECOVERY.md) |
| 自动开发统一任务系统V2 | 已实现精确作用域身份、真实会话队列、跨会话工作区互斥、结构化终态门禁和旧入口兼容 | [自动开发统一任务系统V2](./AUTOMATIC-DEVELOPMENT-UNIFIED-TASK-SYSTEM-V2.md) |
| Agent MCP/Skill注册与继承 | 已实现全局、群聊、项目主Agent工具调用，以及项目子Agent签名快照、原生注册和精确作用域复验 | [Agent MCP与Skill注册继承流程](./AGENT-MCP-SKILL-INHERITANCE.md) |
| MCP/Skill工具市场供应链 | 已实现安全来源、完整物料哈希、隔离事务、Admin签名激活、多传输MCP、归属卸载和启动恢复 | [MCP/Skill工具市场完整业务流程](./MCP-SKILL-MARKETPLACE-SUPPLY-CHAIN.md) |
| 全链路模型语义路由 | 已实现统一模型决策、跨Agent选人、TestAgent语义计划、模型记忆提取、结构化验收与失败回执 | [全链路模型语义路由完整业务流程](./MODEL-SEMANTIC-ROUTING-END-TO-END.md) |
| 知识库召回与本地Embedding V3 | 已实现真实本地/远程语义候选、generation索引、作用域门禁、Token预算和加密凭据 | [知识库召回与本地Embedding V3](./KNOWLEDGE-RETRIEVAL-EMBEDDING-V3.md) |
| 音乐意图识别与统一播放器V2 | 已实现模型语义意图、唯一播放决定、latest-wins持久队列、浏览器原子领取和精确来源回执 | [音乐意图识别与统一播放器V2](./MUSIC-INTENT-UNIFIED-PLAYBACK-V2.md) |
| 音乐曲库与媒体平台V4 | 已实现SQLite媒体状态、版本化曲库索引、流式上传、音质原位升级、平台网络门禁和三源AI选歌 | [音乐曲库、媒体平台与统一播放器完整链路V4](./MUSIC-LIBRARY-MEDIA-PLATFORM-V4.md) |
| TestAgent独立验收与主Agent自验 | 已实现任务级不可变模式快照、真实自验证据、失败关闭和模式匹配终态门禁 | [TestAgent独立验收与主Agent自验](./TEST-AGENT-AND-MAIN-AGENT-SELF-VERIFICATION.md) |
| 飞书全局与项目Agent双向会话V2 | 已实现双入口、精确话题身份、跨传输幂等、原消息队列恢复和原路投递；群聊不再直连飞书 | [飞书全局与项目Agent双向会话V2](./FEISHU-GLOBAL-PROJECT-BIDIRECTIONAL-V2.md) |
| 全局Agent运行体系V2 | 已实现服务端权威精确会话队列、单轮写授权、完整轮次正式压缩、Mission监督和终态持久投递 | [全局Agent运行体系V2](./GLOBAL-AGENT-RUNTIME-PRODUCTION-V2.md) |
| 三类会话CC式统一Agent Loop | 已实现全局、群聊和项目首轮统一理解、按需只读工具、同Run续轮与一次问候调用 | [三类会话CC式统一Agent Loop](./THREE-SESSION-CC-MAIN-AGENT-LOOP.md) |
| 三类主Agent CC式工具体系 | 已实现统一工具目录、12项工作区只读能力、按需Schema加载、精确作用域令牌和无主Agent源码写权限 | [三类主Agent CC式工具体系](./MAIN-AGENT-CC-STYLE-TOOLS.md) |
| 需求池、文档、图片与附件摄取V2 | 已实现流式上传、固定IP公网读取、完整Token分片、来源证据门禁、需求池原子认领和孤立附件清理 | [需求资料摄取完整流程V2](./REQUIREMENT-INGESTION-END-TO-END-V2.md) |
| 定时任务与AI日报周报V3 | 已实现不可变证据快照、模型结构化总结、时区调度、证据校验和飞书持久投递 | [定时任务与AI日报周报完整链路](./SCHEDULED-TASKS-AI-WORK-REPORTS.md) |
| 项目Git与代码协作V2 | 已实现真实仓库身份、分页快照、仓库级写入租约、显式提交范围、TestAgent内容证据和原子克隆恢复 | [项目Git与代码协作完整链路V2](./PROJECT-GIT-CODE-COLLABORATION-V2.md) |
| 内置终端与项目运行控制台 | 已实现异步PTY/降级执行、完整进程树终止、源码运行事务、日志恢复和可核验状态回执 | [内置终端与项目运行控制台完整链路](./BUILT-IN-TERMINAL-AND-PROJECT-RUNTIME.md) |
| 性能监控、Trace、可靠性与清理中心V2 | 已实现SQLite跨进程账本、脱敏Trace、三类作用域指标、异步演练、物化回放和可续跑清理事务 | [性能监控、Trace、可靠性与清理中心完整链路V2](./PERFORMANCE-TRACE-RELIABILITY-CLEANUP-V2.md) |
| 桌面宠物与用户通知V2 | 已实现持久用户通知、精确用户归属、Electron签名领取与展示确认、网页宠物接管、通知中心和安全资源链 | [桌面宠物与用户通知完整业务流程](./DESKTOP-PET-AND-USER-NOTIFICATIONS.md) |
| 工作台与菜单管理V3 | 已实现只读分页工作台、阻塞感知任务动作、项目双控制、工作区默认与个人覆盖、多端revision同步 | [工作台与菜单管理完整链路](./WORKBENCH-AND-NAVIGATION-END-TO-END.md) |
| npm安装、CLI与服务生命周期V2 | 已实现签名实例身份、排空停止、事务更新与回滚、可信双包产物、资源按需交付和项目命令拆分 | [npm安装、CLI与服务生命周期完整链路](./NPM-CLI-SERVICE-LIFECYCLE.md) |
| 全项目业务覆盖治理V1 | 已实现结构化权威清单、真实入口扫描、自动矩阵生成、专项测试归属和发布覆盖门禁 | [全项目业务覆盖矩阵完整治理流程](./PROJECT-BUSINESS-COVERAGE-GOVERNANCE.md) |

## 收录规则

1. 业务流程必须已经实现并完成针对性回归，不能只记录设计方案。
2. 文档必须明确用户入口、参与角色、数据和通信方式、状态流转、失败处理及验收条件。
3. 主 Agent、项目子 Agent、TestAgent 和用户的责任边界必须分开描述。
4. 涉及会话、任务、项目、权限或记忆时，必须写明精确作用域和跨作用域拒绝策略。
5. 原始协议字段和排障标识可以记录，但不能代替用户可理解的业务说明。
6. 实现变化后同步更新本文索引、对应流程文档及 `docs/CURRENT.md`。
