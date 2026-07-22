# CCM 测试指南

测试入口按业务领域组织，构建在每个领域开始前只执行一次。测试全部使用本地 fixture 或 mock Provider，不应产生付费模型调用。

## 常用命令

```powershell
npm test
npm run test:domain -- --list
npm run test:domain -- memory
npm run test:all
npm run test:quick -- --no-build
```

`npm test` 等同于快速回归。`--no-build` 只适合已经完成对应构建的本地连续验证。每次运行的机器可读结果写入 `scratch/domain-test-report.json`。

## 领域

| 命令 | 覆盖范围 |
| --- | --- |
| `npm run test:core` | 核心、认证、存储与会话轮次控制 |
| `npm run test:memory` | 会话压缩、动态窗口、全局记忆与第三方记忆 MCP |
| `npm run test:tasks` | 任务、附件、权限审批与验收 |
| `npm run test:agents` | 第三方 Agent、Provider 和内部 MCP |
| `npm run test:integrations` | 飞书与终端集成 |
| `npm run test:frontend` | 工作台、弹窗和关键页面渲染 |
| `npm run test:knowledge` | 知识库、检索和对话搜索 |
| `npm run test:media` | 音乐和宠物 |
| `npm run test:release` | CLI、跨平台依赖和 npm 安装包 |

领域文件定义在 `scripts/test-domains.json`。`scripts/domain-test-catalog-selftest.mjs` 会检查活跃入口数量、旧别名数量、文件存在性、重复项和专项测试库存。

## 历史命令

原有 213 个 `test:*` 命令没有删除，已迁移到 `scripts/legacy-test-aliases.json`。兼容执行方式为：

```powershell
npm run test:legacy -- test:memory-center-live-token-display
```

历史别名适用于专项回归、真实链路或需要独立环境的测试，不全部纳入快速套件。新增测试应优先进入对应领域，不再继续扩张 `package.json`。

## 已知专项差异

- `memory-core-session-isolation-selftest.mjs` 仍保留，但其中两项旧断言与当前状态结构不一致，未纳入发布套件。
- `page-load-performance-regression.mjs` 需要已登录的可见浏览器环境，不能作为无交互快速回归。

这两项没有被删除或伪装成通过；完成适配后再放回相应领域。

## 发布验收

```powershell
npm run release:preflight
npm run release:package-install
npm run release:acceptance:live
```

- `release:preflight`：读取 Codex、Claude Code、Cursor、Gemini CLI、OpenCode 的安装、登录、版本和当前模型，不调用模型。
- `release:package-install`：生成 tarball，在系统临时目录真实执行 npm 安装、启动、首次注册、核心 API 和持久终端检查。
- `release:acceptance:live`：显式执行五种 Provider 的只读 marker 请求，并要求最近 30 分钟存在真实飞书入站、出站和权限决定证据。最多产生五次模型调用。
- live 报告写入 `scratch/release-live-acceptance-report.json`，不保存 Provider 原始输出或凭据。

GitHub Actions 的 `release-matrix.yml` 在 Windows/Ubuntu 与 Node.js 20/22 四种组合中执行无付费发布门禁。真实 Provider 与飞书验收只允许在具备用户凭据的受控环境手动启动。
