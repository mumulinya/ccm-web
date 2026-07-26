# 开发 Agent 账号与动态模型目录

## 目标

开发 Agent 设置页展示当前实际登录账号，并根据当前 Agent、当前账号和当前 Provider 返回的模型能力生成模型下拉框。静态候选不能冒充账号可用模型。

## 账号识别

- Codex：只读取本机 `auth.json` 中 ID Token 的公开身份 claim。
- Cursor：读取 Cursor Agent 本机配置中的 `authInfo`；本地信息缺失时才调用 CLI 状态检查。
- Gemini：优先读取当前 Google 账号记录，其次读取 ID Token 的公开身份 claim。
- OpenCode：展示已连接 Provider 及其公开账号标识。
- Claude Code API：属于 API 凭据模式，不伪造登录用户。

前端只会收到邮箱、名称或账号标识。Access Token、Refresh Token、API Key 和完整凭据对象均不会离开后端。

## 模型目录

- Codex：读取当前账号由 Codex 生成的本机模型目录，过滤 `hide/hidden` 内部模型。
- Cursor：执行当前账号的 `cursor-agent models`。
- Gemini：使用当前 Gemini 凭据读取 Google 模型列表，并只保留支持 `generateContent` 的模型。
- OpenCode：执行 `opencode models`，列表按 `provider/model` 展示。
- Claude Code API：请求用户配置的 Provider `/v1/models`。

有真实模型目录时，页面使用原生下拉框。Agent 无法枚举模型时，页面会说明原因，并降级为“自动模式或手动模型 ID”，不会展示写死列表。

## 验证

- `npm run check`：通过。
- `npm run build:frontend`、`npm run build:backend`：通过。
- `node scripts/agent-provider-settings-selftest.mjs`：11 项通过。
- `node scripts/agent-provider-account-model-render-selftest.mjs`：2 项浏览器回归通过，0 个页面错误。
- 本机真实探测确认 Codex 与 Cursor 均能识别登录状态和账号，Codex 模型来自账号目录。
- 截图：[desktop-agent-accounts-and-models.png](evidence/desktop-agent-accounts-and-models.png)
- npm release 回归 5/5 通过，已发布 `@mumulinya167/cc-web@1.0.22`，`latest` 已核验为 `1.0.22`。

验证未执行任何付费模型推理调用。
