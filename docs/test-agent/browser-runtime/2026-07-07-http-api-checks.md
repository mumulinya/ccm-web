# TestAgent HTTP API Checks

日期：2026-07-07

## 目标

继续增强 TestAgent 的真实功能验证能力。之前 HTTP verifier 主要做页面可访问性和同源资源探测，本轮增加显式 `httpChecks`，让群聊主 Agent 后续可以要求 TestAgent 验证 API 状态码、响应文本、JSON 字段、错误返回等。

## 本轮完成

- `TestAgentProjectTarget` 增加：
  - `httpChecks`
  - `http_checks`
  - `apiChecks`
  - `api_checks`
- 新增 `HttpCheckSpec`：
  - `name`
  - `url`
  - `method`
  - `headers`
  - `body`
  - `json`
  - `assertions`
  - `timeoutMs`
- 新增 `HttpAssertionSpec`：
  - `status`
  - `contentTypeIncludes`
  - `textIncludes`
  - `textNotIncludes`
  - `jsonPathEquals`
  - `jsonPathIncludes`
- `work-order.ts` 支持 HTTP/API 检查规范化和常见别名：
  - `expect_status` / `expected_status` -> `status`
  - `response_contains` -> `textIncludes`
  - `json_path_equals` -> `jsonPathEquals`
  - `json_path_includes` -> `jsonPathIncludes`
- `http-verifier.ts` 现在会执行：
  - 默认页面 HTTP 探测；
  - 显式 API checks；
  - JSON request body；
  - JSON path assertion；
  - 预期 4xx/5xx 状态码断言。
- `dev-server.ts` 启动条件扩展到 `httpChecks`，只有 API 检查也能启动项目服务。
- `HttpCheckResult` 增加：
  - `name`
  - `method`
  - `assertions`
  - `responsePreview`
- Markdown 报告的 HTTP details 现在展示：
  - method；
  - URL；
  - HTTP status；
  - assertions；
  - resource sample；
  - response preview。
- coverage analyzer 会把 HTTP assertion 和 response preview 纳入验收证据匹配。
- `agent-profile.ts` 增加 `http_api_assertions` 能力说明。
- 新增 `runTestAgentHttpApiSelfTest()`：
  - 启动临时 Node HTTP server；
  - 验证 GET `/api/health`；
  - 验证 POST `/api/echo` JSON body；
  - 验证 GET `/api/missing` 的预期 404；
  - 验证 acceptance coverage 能识别 Health endpoint 证据。

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

## 后续接入点

群聊主 Agent 后续可以传：

```json
{
  "requiredChecks": ["api"],
  "projects": [{
    "name": "backend",
    "workDir": "/path/to/project",
    "runCommand": "npm run dev",
    "startupUrl": "http://127.0.0.1:3000/health",
    "httpChecks": [{
      "name": "Create user rejects short password",
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

- JSON path 仅支持基础 `a.b[0]` 访问，不是完整 JSONPath 标准。
- 暂未支持 cookie/session 自动复用；如果 API 需要登录，后续可以通过 headers 或浏览器 provider 的状态桥接。
- 还没有自动生成 adversarial API probes；目前由 work order 显式传入。
