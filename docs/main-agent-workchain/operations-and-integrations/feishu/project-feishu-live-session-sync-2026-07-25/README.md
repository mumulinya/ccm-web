# 项目飞书会话实时同步

## 目标

项目飞书消息在飞书进入项目主 Agent后，当前打开的 Web 项目会话应自动显示用户消息和正式回复，不要求用户刷新页面或点击会话。

## 数据流

```text
飞书消息
-> cc-connect 写入精确项目会话
-> 项目 ACP 解析绑定的项目与 session ID
-> CCM 同步 cc-connect transcript
-> runtime SSE: project.session_messages_changed
-> Web 仅重拉当前项目会话列表与当前会话详情
```

项目 ACP在两个时点发出安全通知：

- `inbound`：解析出精确项目会话后同步用户消息。
- `reply`：ACP文本交付并结束回合后延迟同步正式回复。

`cc-connect` 追加历史时不保证更新会话 `updated_at`。CCM因此比较真实 history与飞书绑定内容，不能只依赖时间戳；读取项目会话详情前也会先从权威 cc-connect transcript同步，避免 SSE到达后仍返回旧网页副本。

项目上下文计量与全局会话保持同一原则：有可信 Provider usage时优先使用实测加后续增量；没有 usage时，未压缩会话估算完整 transcript，已压缩会话估算正式模型摘要加压缩边界后的近期原文。计量同时返回消息与摘要 Token分项，不能因为尚未调用 Provider而显示为 0。

当会话已有内容但占模型容量不足 `0.1%` 时，界面显示 `<0.1%`，同时保留真实 Token 数和消息分项，避免把低占用误解为没有上下文。

事件只包含项目、会话 ID、阶段和来源，不包含消息正文、附件、transcript 或凭据。正文仍通过已认证的项目会话详情接口读取。

## 前端策略

- 只处理与当前项目一致的 `project.session_messages_changed`。
- 事件绑定的 session ID 与当前会话不一致时不替换当前正文。
- 120ms 合并同一回合的连续事件，避免重复请求和界面闪动。
- 保留用户当前滚动位置；仅在原本位于底部时自动滚动到新消息。
- SSE断线时，仅当前打开的飞书会话每 60 秒执行一次低频兜底；网页会话不轮询。

## 失败边界

- ACP通知接口仅接受带 `X-CCM-ACP: 1` 的内部请求。
- 项目、会话必须通过现有验证且会话真实存在。
- 通知失败不改变 Agent回复结果，只记录不含正文的诊断日志。
- 兄弟项目或兄弟会话事件不得替换当前消息列表。

## 验证

- `node scripts/project-feishu-session-binding-selftest.mjs`
- `node scripts/feishu-project-main-agent-acp-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run build:backend`
- `npm run docs:check`

测试 Provider均为 mock，付费调用为 0。
