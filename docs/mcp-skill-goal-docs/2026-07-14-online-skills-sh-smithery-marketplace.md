# Skills.sh 与 Smithery 内置在线商城

日期：2026-07-14

## 目标

工具配置中的技能商城不再要求用户先查找并填写外部来源地址：

- 内置 `Skills.sh` Skill 频道；
- 内置 `Smithery` MCP 频道；
- 真实在线搜索、分类、排序和分页；
- 预览、安装、重新同步、更新与卸载继续走 CCM 统一安全链路；
- 用户界面只展示易懂状态，来源证明、Hash、传输参数等技术材料放在预览和最近操作详情中；
- 提供生产 API、自测、可逆真实安装和 Playwright 桌面/移动截图证据。

## 官方接入

### Skills.sh

搜索使用 `https://skills.sh/api/search`。这是官方 `skills` CLI 当前使用的公开接口，不抓取 Next.js 页面 HTML，也不依赖需要 Vercel OIDC 的 `/api/v1/*` 接口。

搜索结果中的 `source` 用于定位 GitHub `owner/repo`，`skillId` 用于在仓库中匹配 Skill。CCM 安装时会再次调用 Skills.sh 搜索接口核对 registry ID，再浅克隆 GitHub 仓库、定位对应 `SKILL.md`，并执行原有的路径、符号链接、单文件大小、总包大小与文件数校验。

公开搜索接口要求至少两个字符，并且单次最多返回约 100 条结果。CCM 会在界面明确提示这一限制，并在这 100 条结果内提供分页；用户可通过更具体的搜索词缩小范围。

### Smithery

搜索使用 `https://api.smithery.ai/servers`，支持匿名 `q`、`page` 和 `pageSize`。浏览、搜索和分页不再要求 Smithery API Key。

安装与预览不会信任浏览器提交的 MCP URL。后端根据 `smithery:<qualifiedName>` 再请求官方详情接口，从 `deploymentUrl` 或 HTTP connection 中取得当前 HTTPS MCP 地址，然后才进入 CCM 安装、工具重载、授权影响与运行时重同步流程。

旧 `/api/smithery/config` 接口保留兼容，但 GET 只返回 `configured` 和空字符串 `key`，不会把历史密钥值返回浏览器。

## 查询契约

`GET /api/marketplace/list` 新增：

- `source=skills-sh|smithery`
- `query`
- `category`
- `sort=relevance|popular|name`
- `page`
- `pageSize`

响应新增：

- `pagination.schema = ccm-marketplace-pagination-v1`
- `query`：用户搜索词、实际应用搜索词、分类与排序；
- `sourceStatus.schema = ccm-marketplace-source-status-v1`
- `sourceStatus`：在线/匿名状态、官方上游地址、结果限制和友好提示。

前端使用请求序列保护。用户切换频道后立即搜索时，较早发出的默认列表请求即使更晚返回，也不能覆盖最新搜索结果。

## 用户界面

- 商城频道首选项直接包含 Skills.sh 与 Smithery；
- 在线频道提供搜索、分类、热度/相关度/名称排序和分页；
- Skill 展示安装次数，MCP 展示使用次数与 Smithery 验证标记；
- 结果卡提供来源链接、预览、安装/重新同步和卸载；
- 加载、空结果、限流、超时和上游错误有独立友好状态；
- 最近商城操作默认折叠并移动到结果列表之后，避免技术记录遮挡商品首屏；
- 桌面和移动布局均使用稳定网格，按钮和长文本不造成横向溢出。

## 安全与生命周期

两个新频道继续复用现有实现：

1. HTTPS 与 DNS 内网地址限制；
2. source-bound 安装复验，不信任客户端 command、args、URL 或 prompt；
3. Skill 文件数、单文件、总包大小和符号链接校验；
4. MCP/Skill 来源证明与内容 Hash；
5. 安装、更新、卸载前授权影响检查；
6. 工具管理器重载；
7. 受影响项目和群聊运行时自动重同步；
8. 操作审计与可追溯卸载。

在线来源没有稳定版本号时，已安装条目提供“重新同步”。该操作调用现有 update API，重新从官方注册表复验并写入当前材料，而不是信任旧列表数据。

## 验证结果

### 源码与构建

- `npm run check`：通过；
- `npm run build:backend`：通过；
- `npm run build:frontend`：通过；
- `node scripts/runtime-tool-fabric-selftest.mjs`：通过，包含新增在线查询、分页边界、来源身份和凭据隐藏检查。

### 真实生产 API

`npm run test:online-marketplace`：通过。

- Skills.sh `react` 真实搜索成功；
- Skills.sh `web-design-guidelines` 真实 GitHub 包预览成功，返回经过校验的 `SKILL.md` 与 package stats；
- Smithery `github` 匿名搜索与服务端第 1/2 页分页成功；
- Smithery 官方详情复验成功并返回 HTTPS MCP transport；
- Smithery 配置接口不返回密钥值。

真实生命周期验收按操作隔离执行，确保每次工具目录重载都取得独立响应：

- Skills.sh `web-design-guidelines`：安装、更新、卸载全部成功；
- Skill 安装和更新记录来源均为 `skills-sh`，source proof 完整；
- Smithery `github`：安装、更新、卸载全部成功；
- Smithery 官方详情解析到 `https://github.run.tools`，source proof 为 `remote_mcp`；
- 最终 `/api/marketplace/installations` 中 Skills.sh / Smithery 测试条目数量为 0；
- 生命周期原子逻辑继续由 `runMarketplaceInstallE2ESelfTest` 的临时目录测试自动覆盖；
- 生产安装、更新与卸载审计记录按系统策略保留。

### Playwright 截图

`npm run test:online-marketplace:render`：通过，5 项断言、0 个页面/控制台错误。

- `evidence/online-marketplace-2026-07-14/desktop-skills-sh-search.png`
- `evidence/online-marketplace-2026-07-14/desktop-smithery-preview.png`
- `evidence/online-marketplace-2026-07-14/mobile-smithery-search.png`
- `evidence/online-marketplace-2026-07-14/report.json`

截图回归还验证 Smithery `github` 搜索结果总数小于全量注册表，专门防止旧的默认列表请求覆盖最新搜索请求。

## 生产入口

`http://127.0.0.1:3082/?tab=tools`，进入“技能商城”。
