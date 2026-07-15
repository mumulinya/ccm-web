# Agent CLI Probe Runtime Hardening

## 背景

长期目标要求 CCM 集中管理 MCP/Skill，并确保群聊授权后的 Claude Code、Cursor、Codex 等项目子 Agent 能真实继承、发现和调用授权工具。该链路不能只依赖配置生成成功，还必须通过真实 CLI 探针证明子 Agent 具备项目内执行能力。

本轮复检发现三类问题：

- Cursor CLI 能启动，但旧探针文案被解释为聊天确认，未写入握手文件。
- Codex CLI 在 Windows 下使用 `workspace-write` 仍实际进入 `read-only` sandbox，且 CCM 环境白名单漏传 Codex Desktop 本地 provider token。
- Claude Code 配置了 `ANTHROPIC_BASE_URL=http://127.0.0.1:15721`，但该本地网关端口未监听，旧流程会长时间超时。

## 本次变更

### Cursor 探针执行语义

- 文件：`backend/modules/collaboration/collaboration.ts`
- 将 Agent CLI 写入探针 prompt 从“握手说明”改为强制执行型英文指令。
- 明确要求子 Agent：
  - 不解释、不确认理解；
  - 在当前工作目录创建指定 `.ccm-permission-probe-*.tmp` 文件；
  - 文件内容必须精确匹配 token；
  - 写入成功后只输出 `CCM_AGENT_PROBE_OK`。

### Cursor Windows wrapper

- 文件：`backend/agents/cli-prompt-runner.ts`
- wrapper 在 Windows 上先用 `where.exe` 解析 `cursor-agent`。
- 当解析结果是 `.cmd`/`.bat` 时使用 `shell: true`，避免 Node 直接 spawn `.cmd` 触发 `EINVAL`。

### Codex Windows 写入模式

- 文件：`backend/agents/runtime.ts`
- Codex 命令模板新增 `CCM_CODEX_SANDBOX` / `CCM_CODEX_SANDBOX_MODE` 覆盖项。
- 非 Windows 默认仍使用 `workspace-write`。
- Windows 默认使用实测可写的 `danger-full-access`，因为当前 Codex CLI 0.115.0 在 Windows 下即使命令行指定 `workspace-write` 仍会显示并执行为 `read-only`。
- 该变更只处理 Codex CLI 文件系统执行能力；MCP/Skill 授权仍由 CCM 运行时快照、dispatch gate 和工具调用代理控制。

### Codex Desktop 本地 provider token

- 文件：`backend/agents/execution-kernel.ts`
- 将 `CCM_CODEX_LOCAL_ACCESS_TOKEN` 加入 `sanitizeExecutionEnv` 默认白名单。
- 修复 CCM API 路径能生成 isolated `CODEX_HOME`，但启动 Codex 子进程时没有继承本地 provider token，导致模型请求失败的问题。

### Claude Code 本地网关快速阻断

- 文件：`backend/modules/collaboration/collaboration.ts`
- 读取 `~/.claude/settings.json` 中的 `ANTHROPIC_BASE_URL`。
- 当目标 runtime 是 Claude Code 且 base URL 是本机 HTTP 地址时，先做 TCP 端口探测。
- 若端口不可达，探针快速返回 `claude-local-gateway-unreachable`，避免等待 120 秒 CLI 超时，并给出修复动作。

### 类型编译修复

- 文件：`backend/modules/collaboration/memory.ts`
- 将动态 typed memory / global memory arbitration JSON 结构显式标记为 `any`，避免 TypeScript 将运行期 JSON index 窄化为不含 `schema` 的文件索引类型。

## 验证

- `npm run build:backend`：通过。
- Cursor 直连 CLI 写入探针：通过，文件写入成功且输出 `CCM_AGENT_PROBE_OK`。
- Cursor CCM API 探针：通过，`success=true`，`capabilities.filesystem=workspace_write`。
- Codex 直连 CLI 写入探针：
  - `workspace-write`：失败，实际 `sandbox: read-only`。
  - `danger-full-access`：通过，文件写入成功且输出 `CCM_AGENT_PROBE_OK`。
- Codex CCM API 探针：通过，`success=true`，`capabilities.filesystem=workspace_write`。
- Claude CCM API 探针：快速阻断，`execution_path=claude-local-gateway-unreachable`，原因是 `http://127.0.0.1:15721` 端口 `ECONNREFUSED`。

## 剩余风险

- Claude Code 真实 CLI 探针仍未通过，需要先启动或修复 `ANTHROPIC_BASE_URL=http://127.0.0.1:15721` 对应的本地代理。
- Codex Windows 采用 `danger-full-access` 才能写入，文件系统隔离比 `workspace-write` 宽；后续应跟进 Codex CLI Windows sandbox 行为，若 `workspace-write` 可用，应切回更窄模式。
- 当前已证明 Cursor/Codex 的执行能力，但长期目标仍不能标完成，仍需完整 MCP/Skill 授权继承、越权阻断、商城安装到运行时同步的最新全矩阵证据。
