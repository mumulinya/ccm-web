# TestAgent Work Order Normalization

日期：2026-07-07

## 目标

让后续群聊主 Agent 更容易稳定调用独立 TestAgent。TestAgent 不应该要求上游 JSON 每个字段都完全符合 TypeScript 命名；它需要能接受常见 `snake_case` 字段和动作别名，同时对无法识别的动作/断言给出结构化错误，避免误判通过。

## 本轮完成

- `work-order.ts` 增加浏览器检查规范化：
  - `browser_checks` / `browserChecks`
  - `steps` / `actions`
  - `expectations` / `assertions`
  - `target_url` / `targetUrl` / `url`
- 浏览器 action 支持常见别名：
  - `navigate` / `open` -> `goto`
  - `type` / `input` / `enter_text` -> `fill`
  - `select_option` -> `selectOption`
  - `press_key` / `key` -> `press`
  - `wait` / `wait_for_timeout` -> `waitForTimeout`
  - `wait_for_selector` -> `waitForSelector`
  - `wait_for_text` -> `waitForText`
  - `open_application` -> `openApplication`
  - `request_access` -> `requestAccess`
- 浏览器 assertion 支持常见别名：
  - `hidden` / `not_visible` -> `notVisible`
  - `contains_text` / `text_includes` -> `text`
  - `url_includes` -> `urlIncludes`
  - `title_includes` -> `titleIncludes`
  - `element_text_includes` -> `elementTextIncludes`
  - `network_no_errors` / `no_network_errors` -> `networkNoErrors`
  - `console_no_errors` / `no_console_errors` -> `consoleNoErrors`
- 坐标字段增强：
  - 支持 `[x, y]`
  - 支持 `{ x, y }`
  - 支持 `coordinate` / `coords` / `point`
- 无法识别的浏览器 action/assertion/check 会写入 `WorkOrderIssue`，严重级别为 `error`，最终报告会是 `blocked`，不会静默跳过。
- 新增 `runTestAgentWorkOrderNormalizationSelfTest()`，验证别名转换和非法 action 拦截。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npx tsc -p backend/tsconfig.json --outDir scratch/test-agent-compiled`：通过，输出到临时目录。
- 临时编译后执行 self-test：
  - `runTestAgentSelfTest({ includeBrowser: false })`：通过。
  - `runTestAgentMcpProviderSelfTest()`：通过。
  - `runTestAgentClaudeChromeMcpSelfTest()`：通过。
  - `runTestAgentComputerUseMcpSelfTest()`：通过。
  - `runTestAgentWorkOrderNormalizationSelfTest()`：通过。

## 后续接入点

群聊主 Agent 后续可以传更自然的工作单，例如：

```json
{
  "browser_checks": [{
    "steps": [
      { "action": "request_access" },
      { "action": "open_application", "bundle_id": "com.example.Browser" },
      { "action": "wait_for_timeout", "value": "1000" }
    ],
    "expectations": [
      { "assertion": "console_no_errors" }
    ]
  }]
}
```

TestAgent 会先规范化为内部动作，再交给 browser provider 执行。

## 未完成

- 还没有正式导出 JSON Schema 文件。
- 还没有按 provider 能力做更细的工作单预检，例如 Computer Use 中 selector 动作需要坐标。
- 还没有接入群聊主 Agent 的实际任务完成摘要。
