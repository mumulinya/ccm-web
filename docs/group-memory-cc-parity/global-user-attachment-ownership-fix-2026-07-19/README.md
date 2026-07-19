# 全局 Agent 用户附件归属修复

## 问题

用户通过粘贴或附件入口发送图片后，图片文件上传成功，但会从用户消息中消失，并显示到 Agent 回复下方。

根因由两条链路叠加造成：

1. `/api/global-agent/run` 和旧 `/api/global-agent/chat` 把请求附件作为通用 `files` 返回，前端随后写入 `agentMsg.files`。
2. 用户消息保存了 Base64 `preview`。后端通用历史截断器把超长 `files` 数组改成 `{ truncated, preview }` 对象，历史同步后覆盖了用户侧附件数组。

## 修复行为

- 请求上传附件统一序列化为 `source_files`，包含原文件名、大小、MIME、真实 `/api/uploads/<stored-name>` 地址和 `attachment_owner: user`。
- 暂时保留兼容字段 `files`，但前端不再把它写入 Agent 回复。
- 用户消息在 SSE `result` 到达后合并 `source_files`，保留当前页面的本地预览，同时补齐可持久化上传地址。
- Agent 回复只接受显式 `assistant_files` 或 `output_files`，请求附件不能成为 Agent 附件。
- localStorage 和 `/api/global-agent/history` 仅保存附件元数据，不保存 Base64、`blob:` URL、绝对路径或 `savedPath`。
- 后端历史读取和保存均使用附件专用清洗器；非数组旧值归一化为空数组，未显式标记为 `assistant` 的旧 Agent 附件被移除。
- 渲染只使用 `preview`、`upload_url`、`uploadUrl` 或 `url`，不再按原文件名猜测上传路径。

## 旧数据修复

修复脚本：`scripts/repair-global-user-attachment-ownership-2026-07-19.mjs`。

已恢复两条同名用户图片消息：

- `session_1784034011435` / `2026-07-18T16:20:04.220Z` -> `/api/uploads/1784391604921-c5wmtl.png`
- `session_1782786191998` / `2026-07-18T16:22:23.254Z` -> `/api/uploads/1784391743927-jaaogs.png`

原历史备份保存在 `~/.cc-connect/global-agent-history.json.attachment-ownership-2026-07-19.bak`，会话和原 transcript 均未删除。

## 验证

- `npm run check`：通过。
- `npm run build:frontend`：通过。
- `npm run test:global-user-attachment-ownership`：8 项检查通过。
- `npm run test:session-model-auto-title`：27 项检查通过，付费调用为 0。
- `CCM_BASE_URL=http://127.0.0.1:3080 npm run test:global-ui-render`：桌面与移动端 8 项检查通过。
- 浏览器验证 `http://127.0.0.1:3080/`：两条图片均位于 `.chat-bubble-wrapper.user`，真实上传 URL 可加载；Agent 回复附件数为 0。
- 运行期间真实付费 Provider 调用：0。
