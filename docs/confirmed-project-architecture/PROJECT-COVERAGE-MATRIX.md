# 项目结构与业务流程覆盖矩阵

本文依据生产代码、前端页面、公开 API、CLI 和 `scripts/test-domains.json` 对 CCM 进行全量盘点。它用于回答“一个业务域由什么代码实现、确认文档在哪里”，不是产品规划表。

## 顶层结构

| 目录 | 责任 |
| --- | --- |
| `backend/modules` | 全局、群聊、项目、知识、音乐、定时、搜索、认证和工具等业务模块 |
| `backend/agents` | 主 Agent、开发 Agent、TestAgent 的执行内核、任务交接、续跑和交付回执 |
| `backend/system` | 上下文、压缩、可靠性、任务附件、统一调度、清理和运行事件 |
| `backend/integrations` | MCP、飞书、权限、任务证据和第三方 Agent 记忆 hydration |
| `frontend/src/components` | 工作台及各业务页面；只投影服务端状态，不成为任务或记忆事实源 |
| `ccm-package` | npm 安装包、`ccm` CLI、生产后端和前端资源 |
| `scripts` | 按领域组织的自动化回归、发布验收和文档检查 |

## 业务域覆盖

| 业务域 | 主要实现 | 确认文档 |
| --- | --- | --- |
| 本地登录、注册与会话安全 | `system/local-auth.ts`、`AuthPage.vue` | [本地认证与访问安全](./LOCAL-AUTH-AND-SECURITY.md) |
| 全局 Agent 普通问答、运行与任务监督 | `global/*`、`agents/global/*`、`GlobalAgent.vue` | [全局 Agent 运行体系](./GLOBAL-AGENT-OPERATIONS.md) |
| 群聊/项目自动开发 | `collaboration/*`、`projects/project-main-agent.ts` | [自动开发](./AUTOMATIC-DEVELOPMENT.md)及端到端流程文档 |
| 需求池、文档、图片和附件摄取 | `requirements/source-ingestion.ts`、`system/task-attachments.ts` | [需求资料摄取](./REQUIREMENT-INGESTION-AND-ATTACHMENTS.md) |
| 任务、队列、权限、TestAgent、回放 | `collaboration/*`、`system/unified-task-scheduler.ts` | [自动开发](./AUTOMATIC-DEVELOPMENT.md)、[权限](./TASK-PERMISSION-APPROVAL.md)、[TestAgent](./TEST-AGENT.md)、[搜索与回放](./CONVERSATION-SEARCH-AND-TASK-REPLAY.md) |
| 定时任务、日报与周报 | `scheduling/*`、`CronJobs.vue`、`AutoDevOps.vue` | [定时开发与工作报告](./SCHEDULING-AND-WORK-REPORTS.md) |
| 项目身份、分组、归档、运行 | `projects/*`、`ProjectManager.vue` | [项目管理与运行](./PROJECT-MANAGEMENT.md) |
| Git 仓库与代码协作 | `projects/project-git.ts`、`tools/git.ts`、`CodeChanges.vue` | [项目代码工作区](./PROJECT-CODE-WORKSPACE.md) |
| 终端与运行控制台 | `tools/terminal.ts`、`project-runtime.ts`、`Terminal.vue` | [终端与运行控制台](./TERMINAL-AND-RUNTIME-CONSOLE.md) |
| MCP、Skill、共享文件和市场 | `tools/tools.ts`、`tools/marketplace.ts` | [工具授权](./TOOL-AUTHORIZATION.md)、[工具市场](./TOOL-MARKETPLACE-AND-CATALOG.md)、[模板与命令](./TEMPLATES-SLASH-COMMANDS-AND-SHARED-FILES.md) |
| 会话、长期记忆和上下文缓存 | `system/session-*`、`knowledge/memory-control-center-*` | [记忆系统](./MEMORY-SYSTEM.md) |
| 知识库与 Embedding | `knowledge/*` | [知识库系统](./KNOWLEDGE-SYSTEM.md) |
| 全局/项目飞书双向会话 | `global/*feishu*`、`projects/project-feishu-turn-queue.ts` | [飞书双向会话](./FEISHU-GLOBAL-AGENT.md) |
| 音乐意图、媒体库和统一播放器 | `music/*`、`MusicPlayer.vue` | [音乐意图与播放](./MUSIC-PLAYBACK.md)、[音乐媒体平台](./MUSIC-LIBRARY-AND-MEDIA.md) |
| 会话全文搜索 | `search/conversation-search.ts`、`SearchHistory.vue` | [会话搜索与任务回放](./CONVERSATION-SEARCH-AND-TASK-REPLAY.md) |
| 性能、Trace、可靠性和清理 | `system/reliability-*`、`soak-test.ts`、`cleanup-center.ts` | [可靠性、监控与清理](./RELIABILITY-OBSERVABILITY-AND-CLEANUP.md) |
| 桌面宠物和用户通知 | `pets/*`、`agent-notifications.ts`、`feishu-reaction-feedback.ts` | [桌面宠物与通知](./DESKTOP-PET-AND-USER-NOTIFICATIONS.md) |
| 工作台和菜单布局 | `App.vue`、`Dashboard.vue`、`menuConfiguration.js` | [工作台与导航](./WORKSPACE-NAVIGATION-AND-MENU.md) |
| npm 安装、CLI 和服务生命周期 | `ccm-package/bin/*`、`process-lifecycle.ts` | [CLI 与服务生命周期](./CLI-INSTALLATION-AND-SERVICE.md) |

## 确认边界

- 表中只列生产代码已存在且有可达入口的能力。
- canonical transcript、任务库、知识文档和长期记忆仍是事实源；前端缓存、搜索收藏和菜单偏好不是事实源。
- 历史兼容接口可以继续读取，但新业务以各文档标出的 V2/V3 路径为准。
- 新增业务域时必须同步更新本矩阵和本目录 `README.md`。
