# Cursor/Codex CLI 运行时适配更新

## 背景

统一 MCP/Skill 目标要求 CCM 生成的运行时快照能被真实 Claude Code、Cursor、Codex 子 Agent 使用。继续刷新真实 CLI 探针时发现两个运行时适配问题：

- Cursor Agent 2026.07 的 `--print/-p` 模式要求 prompt 作为命令参数传入，不再接受 `type file | cursor-agent -p` 这种 stdin 投递。
- Codex CLI 在 CCM 隔离 `CODEX_HOME` 下如果没有模型/provider 配置，会回退到当前 CLI 默认 `gpt-5.3-codex`，本机 ChatGPT auth 不支持该模型；如果只设置空隔离 home，则会失去 Codex Desktop 本地 provider 认证。

## 改动

- `backend/agents/cli-prompt-runner.ts`
  - 新增通用 prompt wrapper。
  - wrapper 读取 prompt 文件，再把 prompt 作为最后一个 argv 传给目标 CLI。
  - 避免把长 prompt 直接拼进 shell 字符串，降低 Windows cmd 转义风险。

- `backend/agents/runtime.ts`
  - Cursor 命令改为通过 `cli-prompt-runner.js` 调用。
  - 保留 `--trust`、`--force`、`--approve-mcps`、`--plugin-dir`、`--output-format json`、`--resume` 等能力。
  - 自测改为解码 wrapper 参数，验证真实 argv，而不是依赖旧命令字符串形态。

- `backend/agents/runner.ts`
  - 外部 runner 自测同步改为解码 Cursor wrapper 参数，继续验证 snapshot plugin dir 能传入 Cursor。

- `backend/tools/runtime-tool-sync.ts`
  - Codex runtime provider 从单一 CCM gateway 扩展为：
    - 优先使用显式 `codexGateway`。
    - 若无 gateway，则读取 Codex Desktop 全局 `codex_local_access` provider。
  - 隔离 `config.toml` 写入 `env_key = "CCM_CODEX_LOCAL_ACCESS_TOKEN"`，密钥只通过进程环境注入，不落盘。
  - 本地 provider 模式会链接/复制 `~/.codex/auth.json` 到隔离 `CODEX_HOME`，但不复制全局 MCP/plugin 配置，保持授权隔离。
  - 修复 TOML section 解析对 CRLF 和 `$` 多行匹配的处理。

- `backend/modules/collaboration/memory.ts`
  - 补充 `Map<string, any>` 泛型，解除 TypeScript 构建阻断。

- `backend/test-agent/self-test.ts`
  - 将 Playwright availability self-test 中的诊断 optional chain 拆成显式 `any` 变量，解除当前 TS 编译阻断。

## 验证

已运行并通过：

```bash
npm run build:backend
npm run test:runtime-tools
```

真实 CLI 快速验证：

- Cursor Agent:
  - `cursor-agent -p --force --trust "只回复一行：CCM_AGENT_PROBE_OK"`
  - 返回 `CCM_AGENT_PROBE_OK`

- Codex CLI:
  - 使用 CCM 新生成的隔离 `CODEX_HOME`
  - provider 为 `codex_local_access`
  - token 通过 `CCM_CODEX_LOCAL_ACCESS_TOKEN` 环境变量提供
  - 返回 `CCM_AGENT_PROBE_OK`

同时确认新生成的 Codex `config.toml`：

- 包含 `model_provider = "codex_local_access"`
- 包含 `env_key = "CCM_CODEX_LOCAL_ACCESS_TOKEN"`
- 包含 `requires_openai_auth = true`
- 不包含 `experimental_bearer_token`、`agt_codex_`、`sk-`

## 当前缺口

Claude Code 当前最小 prompt 仍在 120 秒内超时，导致真实三运行时新鲜 E2E 矩阵还不能完成。目标继续保持 active，不能标记 complete。

下一步应在新后端进程中重跑 `/api/orchestrator/agent-cli-probe`：

- Cursor: 验证新版 wrapper 在 CCM API 探针中通过。
- Codex: 验证隔离 local provider 在 CCM API 探针中通过。
- Claude Code: 继续定位 CLI 超时是模型/API、权限、还是 CCM 调用参数问题。
