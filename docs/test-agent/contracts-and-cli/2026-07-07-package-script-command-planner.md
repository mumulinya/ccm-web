# TestAgent Package Script Command Planner

日期：2026-07-07

## 目标

让 TestAgent 更接近 Claude Code verification agent 的“先看项目约定，再实际运行检查”思路。后续群聊主 Agent 如果只传了 `requiredChecks`，但没有完整列出 `verificationCommands`，TestAgent 可以从项目 `package.json` 中发现已有的 build/test/typecheck/lint/e2e 脚本，并自动补充到验证命令里。

## 本轮完成

- 新增 `backend/test-agent/command-planner.ts`。
- 新增 `TestAgentOptions.autoDiscoverVerificationCommands`，默认开启。
- `runTestAgent()` 在执行命令前会调用 `planVerificationCommands(...)`。
- 自动发现规则：
  - `build` -> `build`
  - `unit_tests` / `test` -> `test:unit` / `unit` / `test`
  - `typecheck` / `typescript` / `tsc` -> `typecheck` / `type-check` / `check:types` / `types` / `tsc`
  - `lint` -> `lint` / `eslint`
  - `browser_e2e` / `e2e` / `playwright` / `cypress` -> `test:e2e` / `e2e` / `playwright` / `test:playwright` / `cypress`
- 自动识别 package manager：
  - `packageManager` 字段；
  - `pnpm-lock.yaml`；
  - `yarn.lock`；
  - `bun.lock` / `bun.lockb`；
  - 默认 `npm`。
- 自动发现结果写入：

```ts
report.metadata.autoDiscoveredVerificationCommands
```

- 如果缺少 `package.json`、解析失败、或 required check 找不到对应脚本，会生成 warning issue，不会直接失败。
- 如果自动补到了命令，会移除该项目原先的 `no_executable_checks` warning。
- 更新 `agent-profile.ts`，声明 `auto_discover_package_scripts` 能力。
- 新增 `runTestAgentCommandPlannerSelfTest()`：
  - 创建临时 `package.json`；
  - 只传 `requiredChecks`，不传 `verificationCommands`；
  - 验证 TestAgent 自动发现并执行 4 个脚本；
  - 验证报告输出包含 `auto build ok`、`auto unit ok`、`auto typecheck ok`、`auto lint ok`。

## 安全边界

- TestAgent 不安装依赖。
- TestAgent 不运行 git 写操作。
- 自动发现只会运行已有 package script，不生成或修改项目文件。
- 最终命令仍经过 `command-runner.ts` 的 unsafe command 拦截。
- 默认只根据 `requiredChecks` 补命令；没有相关 required check 时不会主动扫一遍所有脚本。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit --pretty false`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：通过。
- 临时编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
  - `runTestAgentWorkOrderNormalizationSelfTest()`：通过。
  - `runTestAgentArtifactSelfTest()`：通过。
  - `runTestAgentCoverageSelfTest()`：通过。
  - `runTestAgentCommandPlannerSelfTest()`：通过。

## 后续接入点

群聊主 Agent 后续可以只传：

```json
{
  "requiredChecks": ["build", "unit_tests", "typecheck", "lint"],
  "projects": [{ "name": "web", "workDir": "/path/to/project" }]
}
```

TestAgent 会根据项目 `package.json` 自动补齐可运行脚本，并在报告 metadata 中说明这些命令是如何发现的。

## 未完成

- 还没有读取 README/CLAUDE.md 来发现非 npm 命令。
- 还没有 Python/Go/Rust 等非 Node 项目的自动命令发现。
- package script 本身可能产生构建输出，这是项目既有脚本行为；TestAgent 当前只保证自己不修改源码、不安装依赖、不执行 git 写操作。
