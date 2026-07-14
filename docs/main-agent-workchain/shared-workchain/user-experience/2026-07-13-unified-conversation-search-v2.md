# 统一对话检索中心 v2

日期：2026-07-13

## 目标

将原有的项目会话搜索升级为统一对话检索中心，让用户能在一个页面检索全局助手、群聊全部 Session、项目会话和飞书来源消息，并从结果精确回到原消息。

## 数据来源

- 全局助手：`~/.cc-connect/global-agent-history.json` 中的全部 Session。
- 群聊协作：全部群聊及其全部历史 Session，包含由飞书进入群聊链路的消息。
- 项目会话：`~/.cc-connect/web-sessions/<project>/*.json`。
- 任务关系：通过消息中的 `taskId/task_id` 关联任务标题。
- 附件关系：统一读取 `attachments`、`files` 和 `source_attachments`。
- 生成式空欢迎 Session：仅对“默认会话、单条无 ID 助手欢迎语、内容完全相同”的记录保留最新一条；真实会话和真实重复消息不合并。

## 查询能力

- 默认多词 AND：所有词都必须命中。
- 完整短语：按输入整体匹配，也支持中文或英文引号中的短语。
- 任一词：任意检索词命中即可。
- 服务端筛选：来源、会话类型、项目、群聊、角色、Agent、开始时间和结束时间。
- 服务端排序、准确总数、页数、`has_more` 和分页，单页上限 100。
- Facets 返回当前命中集合的来源、会话类型、角色、Agent、项目和群聊计数。

## API 合同

接口：`GET /api/search`

常用参数：`q`、`match=all|phrase|any`、`source=all|global|group|project|feishu`、`conversation_type`、`project`、`group_id`、`group_name`、`role`、`agent`、`start`、`end`、`sort=newest|oldest`、`page`、`page_size`。

响应 Schema 为 `ccm-conversation-search-v2`。每条结果包含：

- `conversationType/source/sourceLabel`
- `project/groupId/groupName/sessionId/sessionName`
- `messageId/messageIndex/stableMessageId`
- `role/agent/content/timestamp`
- `taskId/taskTitle/attachments`
- `context.before/context.after`
- `matchTerms`

审计字段提供 `scanned_messages`、`elapsed_ms` 和已覆盖来源，不向普通对话正文暴露内部技术数据。

## 精确跳转

统一跳转优先级：

1. 按 `messageId` 精确定位。
2. 无稳定 ID 时按 `messageIndex` 定位。
3. 旧记录缺少身份字段时才按关键词回退。

群聊会先切换到 `groupSessionId` 并加载足够历史，再定位消息；项目、群聊和全局助手都会给目标消息显示短暂 `search-hit` 高亮。全局助手首次打开会等待服务端 Session 同步，且不会把本地临时空欢迎 Session 回写到服务端。

## 用户界面

- 紧凑响应式页面，桌面和 `390×844` 手机均无横向溢出。
- 来源标签、筛选面板、分页、错误重试和请求竞态取消完整可用。
- 结果展示前后各两条上下文、任务和附件摘要。
- 支持复制纯文本、复制 Markdown、最近 10 次搜索和最多 50 条本地收藏。
- 最近搜索与收藏分别保存在 `ccm-conversation-search-recent-v2` 和 `ccm-conversation-search-favorites-v2`。
- 移动端正文采用更短的命中上下文片段，保留“进入会话”查看完整消息。

## 安全边界

- 搜索结果禁止 `v-html`，高亮组件只通过 Vue 文本插值输出。
- 浏览器回归注入 `<img src=x onerror="window.__searchXss=true">`，断言不创建图片元素、不执行事件，并以原始文本显示。
- 查询词被解析为普通文本，不构造动态正则或 HTML。

## 验证

- `npm run check`：通过。
- `npm run build`：前端、飞书 MCP、后端完整构建通过。
- `npm run test:conversation-search`：查询、筛选、分页、关系字段、精确跳转接线、欢迎消息降噪及同步竞态合同通过。
- `npm run test:conversation-search-api`：真实 API、边界页大小、短语、Facets、审计和身份字段通过；最终探针扫描 156 条可检索消息，多次验收约 122-157ms。
- `npm run test:conversation-search-render`：桌面、手机、筛选、收藏、精确跳转、XSS 和横向溢出断言通过。
- 全局历史同步竞态回归：运行前后 Session 数量均为 3，没有新增空欢迎 Session。
- 最终服务：`http://127.0.0.1:3082`。

## 截图证据

- [桌面搜索结果](evidence/conversation-search-v2/01-results-desktop.png)
- [桌面筛选面板](evidence/conversation-search-v2/02-filters-desktop.png)
- [手机搜索结果](evidence/conversation-search-v2/03-results-mobile.png)
- [手机筛选面板](evidence/conversation-search-v2/04-filters-mobile.png)

## 暂不加入向量语义搜索

当前历史规模下，安全的确定性文本检索约 122-157ms，能够提供可解释命中、准确分页和稳定跳转。向量搜索需要额外的嵌入模型配置、索引迁移、权限隔离、增量更新和相关性评估；在这些基础设施没有统一之前加入语义检索，会让结果总数、排序解释和离线可用性变得不稳定。因此 v2 保持本地确定性检索，并为以后增加独立语义模式保留结果 Schema。
