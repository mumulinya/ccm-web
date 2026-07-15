# 内部 MCP 随包注册与只读管理 v1

> 后续已扩展为 7 个内部 MCP、33 个工具。工作流 MCP 的实现、角色权限和真实链路验收见 [主 Agent 内部工作流 MCP 套件 v1](./2026-07-15-internal-workflow-mcp-suite-v1.md)。

## 目标

工具配置页需要让用户看见项目运行链路自带的 MCP，同时与可安装、可编辑、可卸载的外部 MCP 明确分开。内部 MCP 必须随 npm 包交付，不能依赖用户再次从商城安装。

## 用户界面

工具配置页的“工具与连接”分为三类：

1. 内置核心工具。
2. 内部 MCP。
3. 外部 MCP。

“内部 MCP”以只读列表展示：

- 用户名称、当前状态和随包/按任务生命周期。
- 作用范围及包含的工具。
- 配置缺口，例如飞书应用尚未配置。
- 默认折叠的技术标识、发现方式和入口文件。

内部项不提供编辑、停用、删除或商城覆盖操作。飞书需要配置时只提供前往系统设置的入口，密钥不会进入管理接口响应。

## 当前内部 MCP

当前清单包括群聊 Agent 协调器、飞书协作 MCP，以及任务运行、知识上下文、TestAgent 验收、交付工作区、任务证据五个工作流 MCP。

### 群聊 Agent 协调器

- 内部标识：`ccm__group_coordinator`。
- 生命周期：按项目子 Agent 的任务会话注入。
- 工具：`request_coordination`、`request_review`、`report_blocker`、`get_coordination_status`。
- 用途：项目子 Agent 只提交协作需要，由群聊主 Agent 负责仲裁、派发和验收。

### 飞书协作 MCP

- 内部标识：`mcp-feishu`。
- 生命周期：随项目安装，凭证来自系统设置。
- 工具：`list_chats`、`get_chat_history`、`search_messages`、`get_message_detail`。
- 未配置凭证时保留在内部清单并显示“待配置”，不会暴露或伪造可用状态。

## 自动发现与安装包契约

- 后端通过 `ccm-internal-mcp-v1` manifest 自动发现 npm 包根目录下的 `mcp-*` 子包。
- `ccm-package/package.json` 使用 `mcp-*/package.json`、`mcp-*/internal-mcp.json` 和 `mcp-*/dist/**/*` 打包规则，后续新增随包 MCP 无需修改前端列表。
- 群聊协调器是后端内嵌、任务上下文绑定的 MCP，因此由注册表直接登记。
- 注册表从编译模块位置定位 npm 包根目录，不依赖用户从哪个工作目录启动命令。
- 飞书 MCP 会自动进入运行时工具目录；缺少配置时保持禁用，配置齐全后随工具重载启用。

## API 与保护

- `GET /api/tools/internal-mcp`：返回不含密钥的只读内部清单和状态汇总。
- `GET /api/mcp`：只返回外部 MCP，避免同一个飞书 MCP 重复展示。
- `POST /api/mcp` 和 `POST /api/mcp/delete`：拒绝内部 MCP 编辑与删除。
- 商城安装、更新和卸载流程拒绝覆盖内部 MCP；商城中的飞书条目显示为“项目内置”并跳转内部清单。

## 验证

- `npm run test:internal-mcp-catalog`
  - 发现 7 个内部 MCP、33 个工具。
  - 自动注册飞书运行时配置。
  - 接口不泄露飞书密钥。
  - 外部 MCP 列表不重复展示内部项。
  - 编辑、删除、商城覆盖均被阻止。
  - `npm pack --dry-run` 包含注册表、全部 manifest、工作流入口与共享运行层。
  - 从任意工作目录均能定位安装包。
- `npm run test:internal-mcp-render`
  - 桌面与移动端真实渲染。
  - 7 个内部服务和 33 个工具可见。
  - 技术详情默认折叠。
  - 不出现编辑、停用或删除操作。
  - 飞书系统设置导航事件有效。
- 实际运行页 `http://127.0.0.1:3083` 复核
  - 工具配置页展示 7 个只读内部 MCP 与 33 个工具，飞书状态由系统设置决定。
  - 7 个系统保护标识均真实渲染。
  - 技术详情默认折叠，不存在编辑、停用、删除按钮或卡片横向溢出。
- `npm run check`
- `npm run build`

截图产物：

- `scratch/internal-mcp-render/desktop-internal-mcp.png`
- `scratch/internal-mcp-render/mobile-internal-mcp.png`

## 主要文件

- `backend/tools/internal-mcp-registry.ts`
- `backend/core/db.ts`
- `backend/modules/tools/tools.ts`
- `backend/modules/tools/marketplace.ts`
- `ccm-package/mcp-feishu/internal-mcp.json`
- `frontend/src/components/tools/InternalMcpCatalog.vue`
- `frontend/src/components/tools/ToolsConfig.vue`
- `scripts/internal-mcp-catalog-selftest.mjs`
- `scripts/internal-mcp-render-regression.mjs`
