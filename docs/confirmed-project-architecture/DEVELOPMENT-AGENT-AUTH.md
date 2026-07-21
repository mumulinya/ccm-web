# 开发 Agent 认证与运行时

## 适用范围

本流程同时适用于独立项目 Agent 和群聊主 Agent 派发的项目子 Agent。项目选择 `codex`、`cursor` 或 `claudecode` 后，后续任务只读取对应 Provider 的认证，不复用全局 Agent、群聊主 Agent或音乐 Agent 的统一对话模型密钥。

## Codex 与 Cursor

- 设置中心可以直接安装或更新 Codex 与 Cursor CLI，并实时查看安装结果；安装命令由服务端白名单固定，浏览器不能传入任意命令。
- Codex 使用本机 `codex login` 的账号状态；设置中心可以打开设备登录窗口、检查凭据和执行退出登录。
- CCM 给每次 Codex 工具授权生成隔离 `CODEX_HOME`，只同步本机 `~/.codex/auth.json`，不把原始密钥写入项目目录。
- 从设置中心退出 Codex 时，同时移除本机认证文件和所有 CCM 隔离运行时中的认证副本。
- Cursor 使用本机 `cursor-agent login` 或 `agent login` 的账号状态；设置中心展示安装版本、登录账号和登录状态。
- Cursor 登录后，设置中心从当前账号动态读取可用模型；Codex 和 Cursor 选择的模型会以 `--model` 显式传给后续任务。
- Cursor 的任务仍使用 CCM 生成的隔离 HOME 和会话插件，认证由 Cursor 自己的本机凭据读取，MCP 与 Skill 权限不会因此放宽。

## Claude Code

- 设置中心可以直接安装或更新 Claude Code CLI；CLI 与第三方 API 配置必须同时可用。
- Claude Code 不读取 CCM 中的 Claude 账号登录态，直接使用设置中心保存的 Anthropic 兼容第三方 API。
- 配置包含 Base URL、模型名称、凭据类型和 API Key。
- 凭据类型可选 `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`，模型通过 `ANTHROPIC_MODEL` 和 CLI `--model` 注入。
- 密钥由 CCM 本机 AES-256-GCM 凭据仓库保存；配置 JSON 只保存 `ccm-secret://` 引用，GET API 和浏览器永远拿不到明文。

## 派发流程

1. 用户在设置中心完成目标 Provider 的登录或 API 配置。
2. 项目或群聊工作单选择对应的开发 Agent。
3. CCM 解析精确 Provider，构建受控 MCP、Skill、记忆快照和项目工作目录。
4. CCM 只注入该 Provider 的认证来源，并在隔离运行时中启动第三方 Agent。
5. Agent 原始输出、记忆回执和验收继续沿用现有项目或群聊受控写回流程。

Codex/Cursor 未登录、Claude Code API 未完整配置或 CLI 未安装时，该 Provider 在可用性选择中视为不可用，不会作为自动回退目标。

## 安全边界

- 三个 Provider 的凭据不互相回退或串用。
- 登录状态不进入任务 Prompt、记忆快照、日志和文档。
- 设置只影响后续新任务和新原生运行世代；正在执行的子进程不热替换认证。
- MCP 签名作用域、项目路径限制、记忆读取门禁和验收写回规则保持不变。
