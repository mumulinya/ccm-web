# 开发 Agent 认证设置

## 本次完成

- 设置中心新增“开发 Agent”页面。
- Codex CLI、Cursor Agent 支持安装状态、版本、登录状态、登录、退出和重新检查。
- Codex、Cursor 和 Claude Code 支持从浏览器页面启动白名单安装或更新，并查看任务状态。
- Codex/Cursor 支持模型选择，Cursor 登录后动态读取当前账号可用模型；选择结果进入真实 CLI 启动参数。
- Claude Code 支持 Anthropic 兼容 API Base URL、模型、`API_KEY/AUTH_TOKEN` 类型和加密密钥配置。
- 配置正式接入独立项目 Agent 与群聊项目子 Agent 共用的运行时环境生成链路。
- Codex 在 CLI 登录模式下不再被统一对话模型网关隐式接管。
- Codex 退出时同步清理 CCM 隔离运行时中的认证硬链接或副本。
- Claude Code 关闭时会清空允许传入的 Anthropic 认证环境变量，避免继承服务进程中的旧密钥。

## 数据与接口

- 非密钥配置：`~/.cc-connect/agent-provider-settings.json`
- 密钥：`~/.cc-connect/private/credentials.enc.json`
- `GET /api/system/agent-providers`：读取脱敏配置和状态。
- `POST /api/system/agent-providers`：保存配置。
- `GET /api/system/agent-providers/status`：强制刷新 CLI 状态。
- `POST /api/system/agent-providers/{codex|cursor}/login`：打开交互登录窗口。
- `POST /api/system/agent-providers/{codex|cursor}/logout`：退出本机 CLI 账号。
- `POST /api/system/agent-providers/{codex|cursor|claudecode}/install`：启动受控安装或更新。
- `GET /api/system/agent-providers/{codex|cursor|claudecode}/models`：读取模型选项。

## 验证

- TypeScript `--noEmit` 检查通过。
- backend JavaScript production emit 通过；标准 declaration build 因正在运行的 CCM 进程锁定两个既有 `.d.ts` 文件而未能完整覆盖声明文件。
- frontend production build 通过。
- API 隔离 HOME 实测通过：密钥未返回、磁盘只保存凭据引用、Claude 状态正确变为已配置。
- `scripts/agent-provider-settings-selftest.mjs` 覆盖认证来源、密钥保护、Claude 环境注入、URL 校验和 UI/路由接线；付费 Provider 调用为 0。
- Agent runtime 与 runtime tool sync 核心回归均通过；现有聚合脚本仍包含已过期的 `ProjectManager.vue` 表单字段源码断言，该项与本次认证链路无关。
