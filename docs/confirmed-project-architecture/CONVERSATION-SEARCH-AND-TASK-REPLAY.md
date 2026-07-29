# 会话搜索与任务回放

## 会话搜索

- 搜索覆盖全局 Web/飞书会话、群聊会话和项目 Web/飞书会话。
- 只读取 canonical会话文件和任务关联，不索引隐藏Prompt、密钥或其他技术协议。
- 支持全部词、短语、来源、角色、Agent、项目、群聊、日期范围和排序筛选。
- 结果包含消息上下文、附件摘要和关联任务，可跳回精确会话或任务回放。
- 分页和Facet由服务端计算；最近搜索和收藏只保存在当前浏览器，不写入长期记忆。

## 任务回放

- 任务派发和任务回放使用同一任务ID，不是两套记录。
- 回放聚合需求、计划、开发工作项、权限、变更文件、TestAgent/主Agent自验、返工、终态和交付回执。
- 默认显示用户能理解的关键时间线；Provider、session、generation、MCP、Skill和原始事件放在排障层。
- 长时间线按页读取，SSE事件只局部刷新当前任务。
- 任务记录、完整Trace和TestAgent产物分别显示保留状态；过期产物不能伪装为仍可下载。

## 隔离与兼容

- 搜索和回放均按登录权限与精确作用域读取，不能通过查询参数跨项目或跨群聊取数据。
- 历史任务缺少结构化验收时显示“无法证明”，不从自由文本猜测通过。
- 旧Trace仍可查看诊断事件，但明确标记为历史记录。

## 实现入口

- 搜索：`backend/modules/search/conversation-search.ts`
- 回放：`backend/modules/collaboration/task-replay.ts`及`task-replay-*`
- 页面：`frontend/src/components/workspace/SearchHistory.vue`、`frontend/src/components/system/TraceReplay.vue`
