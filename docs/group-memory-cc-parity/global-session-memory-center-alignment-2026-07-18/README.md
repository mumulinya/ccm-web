# 全局 Agent 会话记忆中心对齐

## 问题

全局 Agent 的存储已经包含按 `sessionId` 隔离的压缩状态，但记忆中心此前存在三处展示错误：

- 把全局长期记忆和全局会话放在同一个“全局”分组。
- 把历史测试、诊断和已不在全局 Agent 会话侧栏中的孤立 session 全部展示出来。
- 全局会话详情不展示该会话 canonical summary；所有会话的压缩归档反而出现在全局长期记忆详情。

## 修正

- Memory Center 以 `global-agent-history.json` 的真实会话列表投影全局 Web 会话。
- 会话名称与全局 Agent 侧栏一致，并标记当前会话。
- 没有历史会话索引的旧数据环境继续惰性回退到 memory sessions，保持兼容。
- 前端拆分为“全局长期记忆”和“全局会话 · N”两个分组。
- 默认优先选中当前全局会话。
- `global_session` 详情只展示本会话 canonical summary 和本会话压缩归档。
- 结构化 canonical summary 按目标、近期要求、决策、未完成事项、授权、反馈、文件与最新结果渲染，不显示 `[object Object]`。
- 来源不明的旧摘要标为“历史会话摘要（待模型验证）”，不得冒充 canonical summary。
- 没有可信 Provider usage 时，从当前会话的加密 transcript 和压缩边界估算 Token，不再错误显示为 0。
- 顶层全局长期记忆只展示全局用户偏好、反馈、授权、决策、任务、未解决项和引用，不再混入会话归档。
- canonical summary 与压缩归档在记忆中心只读，避免展示层修改正式压缩链。

## 不变量

- 全局长期记忆仍是跨全局会话共享的长期事实层。
- 会话连续性记忆按精确 `global_session / session:<sessionId>` 隔离。
- 群聊和项目上下文不会进入全局长期记忆或全局会话记忆。
- 孤立旧 session 仅从记忆中心投影中隐藏，本轮不批量删除原始审计数据。

## 验证

- `npm run test:global-memory-center-sessions`：16 项通过。
- `npm run test:global-memory-center-sessions:render`：桌面与手机页面通过，只显示当前真实全局会话，无横向溢出。
- `node scripts/memory-center-live-token-display-selftest.mjs`：23 项通过。
- backend/MCP TypeScript check 与 frontend production build 通过。
