# Gemini CLI 与 OpenCode 开发 Agent 支持

## 结果

CCM 的开发 Agent 不再由项目页面维护固定下拉数组。后端 `backend/agents/catalog.ts` 是项目类型、显示名称、别名、默认启用状态和设置能力的唯一注册来源。

当前项目可选择：

- Claude Code
- Codex CLI
- Cursor Agent
- Gemini CLI
- OpenCode
- Qoder CLI（兼容已有项目，暂不由设置中心管理认证）

## 设置流程

“设置中心 -> 开发 Agent”现在管理五种正式 Provider：Claude Code、Codex、Cursor、Gemini CLI 和 OpenCode。

Gemini CLI：

- 浏览器按钮使用官方 npm 包 `@google/gemini-cli` 安装或更新。
- 登录按钮打开 Gemini CLI，用户可选择 Google 登录或已有 API 凭据。
- CCM 识别 Google OAuth、Gemini API Key、Google API Key 和 ADC 凭据。
- 任务模型可留空跟随 CLI，也可显式填写模型 ID。

OpenCode：

- 浏览器按钮使用官方 npm 包 `opencode-ai` 安装或更新。
- 登录按钮打开 `opencode auth login`，由用户选择并连接模型 Provider。
- CCM 从 OpenCode 凭据仓库判断是否至少配置了一个 Provider。
- 模型列表来自 `opencode models`，保存值使用 `provider/model` 格式。

未安装或未认证的 Agent 仍会出现在项目下拉中，并显示“未就绪”。项目可以先创建，但执行任务时继续由现有 readiness gate 阻止无效调用。

## 执行与 MCP

Gemini CLI 使用 headless JSON 输出、显式模型参数和 CCM 生成的项目 `.gemini/settings.json`。授权 MCP 服务器写入 `mcpServers`，同时写入 `mcp.allowed` 白名单。

OpenCode 使用 `opencode run --format json --auto`。每次授权世代生成隔离的 `opencode.json`，通过 `OPENCODE_CONFIG` 与 `OPENCODE_CONFIG_DIR` 注入，不修改用户全局 OpenCode 配置。CCM MCP 会转换为 OpenCode 的 `mcp.local` 或 `mcp.remote` 格式。

两种 Agent 都继续读取 CCM 的项目/群聊记忆快照、工具授权和 Skill。当前按 CCM scratchpad/新世代保持连续性，不伪造 Provider 原生 session 恢复证据。

## 兼容性

- 旧版 `agent-provider-settings.json` 在读取时惰性补齐 `gemini` 和 `opencode`，无需批量迁移。
- 旧项目 Agent 值继续有效。
- Claude Code 第三方 API、Codex 和 Cursor 的认证行为未改变。
- 项目创建、编辑和切换 Agent 共用 `/api/agents` 注册表接口。

## 验证

- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:agent-provider-settings`：8 项通过，付费调用 0。
- `npm run test:gemini-opencode-agent-integration`：15 项通过，验证 Gemini/OpenCode MCP 配置和启动命令，付费调用 0。
- `npm run test:project-management-render`：8 项桌面/移动端检查通过。
- 真实页面检查：1280px 设置页无横向溢出；390x844 设置页与项目弹窗无横向溢出；新建项目可见 Gemini CLI 和 OpenCode。

旧 `internal-workflow-mcp-selftest` 当前受独立 TestAgent 验收规则变化影响：命令执行通过，但旧 fixture 缺少新规则要求的独立验收证据，因此返回 `need_human`。本次没有放宽该安全门禁，新增的两种运行时由专属零付费集成测试覆盖。

## 参考

- Gemini CLI 官方仓库与安装说明：https://github.com/google-gemini/gemini-cli
- Gemini CLI 官方命令说明：https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/cli-reference.md
- OpenCode 官方安装说明：https://opencode.ai/docs/
- OpenCode CLI：https://opencode.ai/docs/cli/
- OpenCode MCP：https://opencode.ai/docs/mcp-servers/
