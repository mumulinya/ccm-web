# 项目管理生产化升级 v1

日期：2026-07-14

## 目标

把项目管理从“能创建、能聊天”升级为可长期使用的项目 Agent 工作区，覆盖可靠会话、安全生命周期、分层展示、移动端和可复核验收。

## 用户流程

1. 用户选择项目，页面恢复该项目上次使用的会话。
2. 用户明确启动“项目 Agent”，可从更多菜单切换 Claude Code、Cursor、Gemini、Codex 或 Qoder。
3. 消息先持久化到当前会话，再发给项目 Agent；发送期间可主动停止。
4. 普通问话只展示回答，换行会保留；内部状态和工具输出默认放在折叠的“技术详情”中。
5. 任务型回复继续展示计划、进度、验收和代码差异卡片。
6. 项目不再直接删除。归档后可恢复；永久删除必须先查看服务端精确预览，再输入项目名确认。

## 可靠性

- 修复 Agent 切换时所选 Agent 类型未传入启动接口的问题。
- 启动、停止和切换提供忙碌态、成功提示及错误提示，不再依赖固定延时猜测状态。
- 发送时固定项目和会话身份，切换页面不会把回复写入其他会话。
- 无会话时禁止发送，避免刷新后消息消失。
- 流式请求使用 `AbortController`；用户停止、网络中断和服务端错误统一清理流式状态及思考占位。
- 连接建立前失败会恢复输入和附件；已收到的部分回复会保留并说明中断状态。
- 页面卸载或切换项目/会话时会停止当前流式请求。

## 安全边界

- 项目名称拒绝路径分隔符、连续句点、控制字符、Windows 保留名和超长输入。
- 会话 ID 使用严格字符白名单，所有会话文件均通过根目录 containment 检查。
- 会话、工具和共享文件接口只接受活动项目，不能为不存在或已归档项目创建孤儿数据。
- 工作目录必须是存在的绝对目录。
- Agent 类型和项目通道使用 allowlist。
- 飞书扫码预配置使用 15 分钟一次性令牌；只有发起该次扫码的创建请求可以完成同名临时配置，防止普通创建覆盖现有项目。
- 共享文件名和文本大小受限，单个共享文本最大 1 MB。
- 会话自动命名只使用项目配置中的工作目录，不接受请求方覆盖执行目录。
- cc-connect 会话文件采用严格项目名前缀边界，不会把 `smart` 误匹配到 `smart-live`。

## 项目生命周期

新增接口：

- `GET /api/projects/archived`
- `POST /api/projects/archive`
- `POST /api/projects/restore`
- `POST /api/projects/purge-preview`
- `POST /api/projects/purge`
- `GET /api/projects/lifecycle-audit`

兼容接口 `POST /api/projects/delete` 改为安全归档，不再永久删除。

全局 Agent 中原有的“删除项目”管理动作也改为调用归档接口，完成后会明确告诉用户项目可恢复，并展示审计编号。

归档配置保存在 `~/.cc-connect/configs/archived/`。永久删除只允许已归档项目，预览令牌有效 10 分钟，并绑定数据指纹；预览后数据有变化会要求重新确认。

永久删除会清理：

- 已归档项目配置
- 项目网页会话
- 对应 cc-connect 会话
- 项目运行日志
- `project-configs.json` 中的项目设置

默认保留：历史任务与任务回放、TestAgent 验收证据、项目源码目录、知识库内容。

审计记录保存在 `~/.cc-connect/project-lifecycle/audit.jsonl`，归档、恢复和永久删除都会返回审计编号。

## 前端结构

- `ProjectWorkspaceHeader.vue`：项目身份、Agent 状态、主操作和更多菜单。
- `ProjectSessionSidebar.vue`：会话选择与手机抽屉。
- `ProjectArchiveManager.vue`：归档列表、恢复、删除预览、确认和审计记录。
- `ProjectManager.vue`：保留聊天编排、任务卡、知识沉淀、工具配置和流式生命周期。

组件按业务职责拆分，没有拆散聊天核心流程。

## 验收

- `npm run check`：通过。
- `npm run build:frontend`：通过。
- `npm run test:project-management`：6 项隔离 API 回归通过。
- `npm run test:project-management-render`：4 项桌面/手机渲染断言通过。

API 回归证据：`scratch/project-management-production-selftest/report.json`

渲染证据：

- `scratch/project-management-render-regression/desktop-project-workspace.png`
- `scratch/project-management-render-regression/desktop-archive-manager.png`
- `scratch/project-management-render-regression/mobile-project-workspace.png`
- `scratch/project-management-render-regression/mobile-session-drawer.png`
- `scratch/project-management-render-regression/report.json`
