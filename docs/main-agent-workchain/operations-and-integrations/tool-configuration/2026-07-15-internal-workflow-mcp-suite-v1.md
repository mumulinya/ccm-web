# 主 Agent 内部工作流 MCP 套件 v1

## 目标

把群聊任务从计划、项目执行、知识检索、独立验收到合并与回放所需的能力做成随 CCM 安装的内部 MCP。第三方 Claude Code、Codex 和 Cursor 会在任务会话创建时收到签名、限时、限任务和限项目的配置，用户不需要手工安装或维护。

## 五个工作流 MCP

### 任务运行 MCP

- 标识：`ccm__task_runtime`。
- 工具：读取任务上下文、更新 Todo、汇报进度、提交交付候选、请求用户决策。
- Todo、进度、交付和决策写入任务日志与回放时间线，不会由工具直接把任务标为完成。

### 知识上下文 MCP

- 标识：`ccm__knowledge_context`。
- 工具：提取项目上下文、检索知识、分页读取知识文档、列出引用。
- 只读取知识库文件名，不接受任意本机路径；结果受全局、群聊、项目和 Agent 可见范围约束。

### TestAgent 验收 MCP

- 标识：`ccm__test_acceptance`。
- 工具：创建工作单、启动后台验收、读取计划/状态/结论/证据。
- 复用现有原生 TestAgent 工作单、执行计划、浏览器/命令验证和 artifact 保留服务。
- 交付验收只接收内部 `workspace_id`，会把 TestAgent 工作目录绑定到已提交且干净的 worktree，并记录对应 branch 与 commit。
- 只有群聊主 Agent 能创建和启动验收；全局 Agent 不直接连接 TestAgent。

### 交付工作区 MCP

- 标识：`ccm__delivery_workspace`。
- 工具：创建受控 worktree、查看逐行 diff、运行声明过的检查、提交分支、验收后合并、安全清理。
- 群聊主 Agent 是唯一能创建、合并和清理交付工作区的角色。
- 合并前强制要求 TestAgent 结果为 `completed` 且 `canAccept=true`，并与当前 `workspace_id + branch + commit` 完全一致；同任务的旧通过结果不能放行新代码，验收后出现新提交或未提交改动也必须重新验收。
- CCM worktree 写入仓库本地 `.git/info/exclude`，不修改受版本控制的 `.gitignore`，也不掩盖真实用户改动。

### 任务证据 MCP

- 标识：`ccm__task_evidence`。
- 工具：读取完整任务时间线、代码变更、TestAgent 证据和交付回执。
- 项目子 Agent 只能看到当前任务及自身项目允许的代码证据；群聊主 Agent 可用于最终验收和用户总结。

## 角色边界

| 角色 | 自动注入 | 写权限边界 |
| --- | --- | --- |
| 全局 Agent | 任务运行、知识上下文、任务证据 | 负责总目标与群聊派发，不创建 TestAgent 验收，不操作交付 worktree |
| 群聊主 Agent | 五个工作流 MCP | 维护计划、启动 TestAgent、执行验收后合并和清理 |
| 项目子 Agent | 五个工作流 MCP + 群聊协调器 | 更新自身 Todo/进度、实现、检查、提交候选；不能启动验收或合并 |
| TestAgent | 五个工作流 MCP 中的只读/验证子集 | 可读取任务、知识、diff 并运行检查；不能提交代码候选、创建 worktree、提交或合并 |

工具列表由 MCP 进程根据签名上下文中的角色动态过滤，隐藏工具无法通过直接构造 `tools/call` 绕过。

## 上下文与审计安全

- 每次任务注入使用安装级 HMAC 密钥签名，绑定 `taskId`、`groupId`、`project`、角色、会话和工作目录。
- 上下文默认 14 天过期；签名被改动或过期时 MCP 进程拒绝连接。
- 所有调用写入内部 MCP JSONL 审计，密钥、token、正文、diff 和 patch 参数只记录脱敏摘要。
- 每个业务工具重新按绑定任务读取真实 CCM 数据，不能通过参数切换到其他任务或任意工作目录。

## 第三方 Agent 注入

`prepareAgentRuntimeTools` 在真实任务派发、恢复和返工入口调用 `buildTaskBoundInternalMcpServers`：

- Claude Code：写入任务隔离的 strict MCP 配置与会话插件。
- Codex：写入隔离 `CODEX_HOME` 的 TOML 配置。
- Cursor：写入隔离会话插件和 `.mcp.json`。
- 纯咨询请求不注入任务写入型 MCP。

运行时快照把内部 MCP 标记为 `protected`，不进入用户可编辑的外部 MCP 授权清单。

## 管理页与 npm 发布

- 工具配置页只读展示 7 个内部 MCP、33 个工具：群聊协调器、飞书 MCP 和五个工作流 MCP。
- 技术标识和入口路径默认折叠；内部项不提供编辑、停用和删除按钮。
- 五份 `ccm-internal-mcp-v1` manifest 位于 `ccm-package/mcp-*/internal-mcp.json`。
- npm 发布清单包含 manifest、五个入口、共享签名层、任务/TestAgent 存储层和后台 Worker。

## 验收证据

- `npm run test:internal-workflow-mcp`
  - 启动真实 MCP 子进程并完成任务、知识、TestAgent、worktree、合并与证据回放链路。
  - 验证无 TestAgent 证据拒绝合并，有 `canAccept=true` 证据后允许合并。
  - 验证同任务但未绑定交付提交的真实通过结果仍被拒绝，只有在目标 worktree 上验证过同一 commit 才允许合并。
  - 验证 TestAgent 通过后新增未提交文件会再次阻止合并。
  - 验证项目子 Agent、TestAgent、全局 Agent 最小权限和签名篡改拒绝。
  - 验证 Claude Code、Codex、Cursor 三端实际配置都包含 6 个项目子 Agent 任务 MCP。
- `npm run test:internal-mcp-catalog`
  - 验证 7 项、33 个工具、只读保护、密钥隐藏、任意工作目录发现和 18 个 npm 发布文件。
- `npm run test:internal-mcp-render`
  - Playwright 真实渲染桌面/移动页面，检查 7 项、33 个工具、默认折叠、无危险操作和无横向溢出。
- `npm run test:runtime-tools`
  - 验证原有 MCP/Skill 授权、同步、隔离和派发门禁未回归。

截图与结构化报告：

- `scratch/internal-mcp-render/desktop-internal-mcp.png`
- `scratch/internal-mcp-render/mobile-internal-mcp.png`
- `scratch/internal-mcp-render/report.json`
- `scratch/internal-workflow-mcp-selftest/report.json`
- `scratch/internal-mcp-catalog-selftest/report.json`

## 主要实现

- `backend/integrations/internal-mcp-runtime.ts`
- `backend/integrations/agent-internal-mcp.ts`
- `backend/integrations/task-runtime-mcp.ts`
- `backend/integrations/knowledge-context-mcp.ts`
- `backend/integrations/test-acceptance-mcp.ts`
- `backend/integrations/delivery-workspace-mcp.ts`
- `backend/integrations/task-evidence-mcp.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/tools/internal-mcp-registry.ts`
- `frontend/src/components/tools/InternalMcpCatalog.vue`
