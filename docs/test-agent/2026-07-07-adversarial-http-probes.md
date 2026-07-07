# TestAgent Adversarial HTTP Probes

日期：2026-07-07

## 目标

参考 Claude Code verification agent 的要求：验证不能只覆盖 happy path，报告里应该包含至少一种“尝试破坏功能”的 probe。TestAgent 本轮增加显式 adversarial HTTP/API probes，支持群聊主 Agent 后续传入边界值、孤儿资源、无效输入、幂等性等探针。

## 本轮完成

- `TestAgentProjectTarget` 增加：
  - `adversarialHttpChecks`
  - `adversarial_http_checks`
  - `adversarialApiChecks`
  - `adversarial_api_checks`
- `HttpCheckSpec` 增加：
  - `adversarial`
  - `probeType`
  - `probe_type`
- `HttpCheckResult` 增加：
  - `adversarial`
  - `probeType`
- `work-order.ts` 会把 adversarial check 数组里的 HTTP check 自动标记为 `adversarial: true`。
- `http-verifier.ts` 会执行 adversarial probes，并允许预期 400/404 等错误响应通过。
- `dev-server.ts` 会因为 adversarial probes 启动项目服务。
- `result-builder.ts` 的 evidence 会标记 `Adversarial`。
- `artifacts.ts` 的 Markdown HTTP details 会展示：
  - `Adversarial: yes/no`
  - `Probe type`
  - method / URL / assertions / response preview
- `coverage.ts` 会把 probe type 纳入验收证据匹配。
- `agent-profile.ts` 增加 `adversarial_http_probes` 能力。
- 新增 `runTestAgentAdversarialHttpSelfTest()`：
  - 启动临时 Node HTTP server；
  - `boundary` probe：POST `/api/items` 空 JSON，期望 400 和 `name is required`；
  - `orphan` probe：GET 不存在 item，期望 404 和 `item not found`；
  - 验证报告状态 passed；
  - 验证 evidence 标题包含 `Adversarial`；
  - 验证 acceptance coverage 被这些 probes 证明。

## 安全边界

本轮没有做自动生成和自动执行未知 mutation probes。原因是对陌生项目自动发 POST/DELETE/PUT 可能产生副作用。TestAgent 只执行工作单显式给出的 adversarial probes，并把结果结构化记录。

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
  - `runTestAgentHttpApiSelfTest()`：通过。
  - `runTestAgentAdversarialHttpSelfTest()`：通过。

## 后续接入点

群聊主 Agent 后续可以传：

```json
{
  "requiredChecks": ["api", "adversarial"],
  "projects": [{
    "name": "backend",
    "workDir": "/path/to/project",
    "runCommand": "npm run dev",
    "startupUrl": "http://127.0.0.1:3000/health",
    "adversarialHttpChecks": [{
      "name": "Create user rejects short password",
      "probeType": "boundary",
      "method": "POST",
      "url": "http://127.0.0.1:3000/api/users",
      "json": { "email": "a@b.co", "password": "123" },
      "assertions": [
        { "type": "status", "status": 400 },
        { "type": "jsonPathIncludes", "path": "error", "value": "password" }
      ]
    }]
  }]
}
```

## 未完成

- 还没有自动从接口 schema 或 OpenAPI 生成 probes。
- 还没有对 mutating probes 做事务/回滚隔离。
- 还没有 browser-level adversarial probes，例如刷新后状态保持、重复点击、无效输入 UI。
