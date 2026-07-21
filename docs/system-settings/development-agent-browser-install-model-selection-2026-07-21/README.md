# 开发 Agent 浏览器安装、登录与模型选择

## 完成范围

设置中心的“开发 Agent”页面统一管理独立项目 Agent 和群聊项目子 Agent 使用的 Codex、Cursor 与 Claude Code：

- 未安装时，用户可以直接在浏览器页面点击安装。
- 安装由服务端固定白名单命令执行，前端不能提交任意安装命令或包名。
- 页面轮询安装状态，展示安装中、成功或失败；失败时保留有限长度的安装输出用于排查。
- Codex 和 Cursor 安装后可从页面启动官方登录流程。CLI 负责打开系统浏览器并保存本机登录凭据。
- 每个 Provider 可以单独选择任务模型；留空时使用对应 CLI 的默认模型。
- Cursor 的模型列表从当前已登录账号运行 `agent models` 动态读取，同时允许输入 CLI 支持的自定义模型 ID。
- Claude Code 继续使用 Anthropic 兼容第三方 API，模型 ID、Base URL、凭据类型和密钥由用户配置。

## 安装流程

安装接口为 `POST /api/system/agent-providers/{provider}/install`，其中 `provider` 只允许 `codex`、`cursor` 或 `claudecode`。

- Codex：`npm install --global @openai/codex@latest`
- Claude Code：`npm install --global @anthropic-ai/claude-code@latest`
- Cursor Windows：执行 Cursor 固定官方地址的原生 PowerShell 安装器；已安装时调用 CLI 自身的 `update`。
- Cursor macOS/Linux：执行 Cursor 官方 shell 安装器；已安装时调用 CLI 自身的 `update`。

同一个 Provider 同时只允许一个安装任务。安装状态只在内存中用于当前服务周期的页面反馈，不作为认证事实来源；最终是否安装成功仍由命令路径和版本探针重新判定。

## 登录与可用性

- Codex 使用 `codex login`，由 Codex 打开浏览器完成账号登录。
- Cursor 使用 `cursor-agent login` 或 `agent login`，由 Cursor 打开浏览器完成账号登录。
- Claude Code API 模式不使用 Claude 账号登录，必须同时具备已安装 CLI、API 地址、模型和加密凭据。
- Codex/Cursor 只有“已启用 + CLI 已安装 + 已登录”才进入项目 Agent 的可用 Provider 集合。
- 未安装或未登录的 Provider 不再因为命令名存在而被任务回退链误选。

## 模型生效链路

模型配置保存在 `~/.cc-connect/agent-provider-settings.json`，密钥仍只保存在 CCM 凭据仓库。

- Codex 新任务和续接任务显式加入 `--model <model>`。
- Cursor 新任务和续接任务显式加入 `--model <model>`。
- Claude Code 同时使用 `--model <model>` 与既有 `ANTHROPIC_MODEL` 环境变量，确保第三方兼容 API 收到相同模型选择。
- 留空时不追加模型参数，由官方 CLI 或第三方 API 配置决定默认值。
- 配置变更作用于后续 Agent 调用，不修改已经运行的子进程。

## API

- `GET /api/system/agent-providers`：脱敏配置、安装和认证状态。
- `GET /api/system/agent-providers/status`：强制重新检测状态。
- `GET /api/system/agent-providers/{provider}/models`：读取可选模型。
- `POST /api/system/agent-providers/{provider}/install`：启动受控安装或更新。
- `POST /api/system/agent-providers/{codex|cursor}/login`：启动官方浏览器登录流程。
- `POST /api/system/agent-providers/{codex|cursor}/logout`：清理对应 CLI 登录状态。
- `POST /api/system/agent-providers`：保存启用状态、模型和 Claude Code API 配置。

## 验证

- Backend TypeScript `--noEmit` 检查通过。
- Backend production emit 通过。
- Frontend production build 通过。
- `scripts/agent-provider-settings-selftest.mjs` 验证配置迁移、密钥脱敏、模型参数、模型目录和 API/UI 接线。
- 所有自动测试均未调用付费 Provider。

