# 全会话两阶段自动命名

## 目标

全局 Agent、群聊主 Agent 和项目 Agent 的用户可见会话使用同一套自动命名语义：

1. 新建时显示“新会话”。
2. 第一条有意义的用户消息持久化后，立即生成 deterministic 临时标题，侧边栏无需等待模型回复。
3. 首轮 Agent 回复完成后，由当前 CCM 配置的模型综合“用户目标 + Agent 回复”异步生成简短中文标题。
4. 模型结果只替换占位或临时标题；用户手动改名后永不覆盖。
5. 模型调用失败时保留 deterministic 标题并将其确认为 fallback，不阻塞正常回复。

## 统一服务

`backend/system/session-title.ts` 负责：

- 构建模型标题 prompt；
- 通过已有 OpenAI-compatible / Anthropic-compatible 调用器请求当前配置模型；
- 限制标题长度，清理引号、Markdown、“会话标题：”等多余内容；
- 识别“新会话”、“默认会话”和旧“会话 N · 时间”占位标题；
- 排除纯数字和纯符号消息，后续出现有意义对话时仍可自动命名；
- 从第一条用户消息和附件名生成不调用 Provider 的临时标题；
- 保留模型失败时的 deterministic fallback。

## Scope 集成

### 全局 Agent

- 删除前端截取首条用户消息的旧逻辑。
- 历史服务在第一条用户消息同步后立即写入临时标题，在 Assistant 首轮后异步生成模型标题。
- Web 前端通过全局运行事件即时接收标题变化，并继续用服务端历史同步兜底；飞书独立全局会话也走同一规则。
- 客户端携带旧占位标题回传时，不会覆盖已生成的模型标题。

### 群聊

- 任何渠道向 `gcs_*` 追加首条用户消息后立即写入临时标题，追加 Assistant 回复后调度模型标题。
- 同一精确会话的并发调用会合并为一个 in-flight job。
- 标题写入群聊 session manifest，群聊会话列表通过 3 秒轮询刷新。
- 记忆中心直接读取同一 manifest，因此自动同步新标题。

### 项目会话

- 新建项目会话统一使用“新会话”占位，不再使用“会话 N · 时间”。
- 用户消息持久化后立即写入临时标题；Assistant 消息持久化后服务端自动调度模型标题。
- Web、飞书和项目任务投影入口共用同一状态规则。
- 旧 `/api/sessions/auto-name` 保持兼容，但不再通过 shell 执行 `claude -p`，而是复用统一命名服务。
- Memory Center 项目会话标签同时兼容 `name` 和旧 `title` 字段。

## 标题所有权

存储层记录标题来源：

- `placeholder`：尚未命名；
- `provisional`：根据第一条有意义用户消息确定性生成，可由模型结果替换；
- `model`：模型生成；
- `fallback`：模型不可用时本地兜底；
- `manual`：用户手动命名，优先级最高。

状态只允许按 `placeholder → provisional → model/fallback` 自动推进。每次模型结果提交前都会重新读取最新 session；如果用户在模型调用期间已手动改名，模型结果会被丢弃。客户端回传旧占位或临时标题也不能覆盖服务端的 `model`、`fallback` 或 `manual` 标题。

## 验证

- `npm run check`：通过。
- backend/frontend production build：通过。
- `node scripts/session-model-auto-title-selftest.mjs`：38 项通过，覆盖全局、群聊和项目 scope。
- 验证第一条用户消息落盘后无需调用模型即可得到临时标题。
- 验证模型同时收到用户消息与 Agent 回复。
- 验证纯数字不命名、手动标题不覆盖、占位标题不回写覆盖模型标题。
- 测试使用 mock model，真实付费 Provider 调用为 `0`。

## 代码入口

- `backend/system/session-title.ts`
- `backend/modules/global/global-agent-history.ts`
- `backend/modules/collaboration/storage.ts`
- `backend/modules/projects/sessions.ts`
- `frontend/src/composables/useGlobalAgentSessions.js`
- `frontend/src/composables/useGlobalAgentMessaging.js`
- `frontend/src/components/collaboration/useGroupChatMessaging.js`
- `scripts/session-model-auto-title-selftest.mjs`
