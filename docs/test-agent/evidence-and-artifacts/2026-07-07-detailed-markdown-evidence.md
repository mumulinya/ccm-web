# TestAgent Detailed Markdown Evidence

日期：2026-07-07

## 目标

让 `report.md` 更接近 Claude Code verification agent 的证据要求：不仅写最终结论，还要保留“运行了什么、观察到了什么、哪一步失败/通过”。后续群聊主 Agent 可以直接把 Markdown 报告交给用户或复盘系统，而不是只展示一句摘要。

## 本轮完成

- 增强 `backend/test-agent/artifacts.ts` 的 Markdown 报告生成。
- `report.md` 现在包含：
  - Dev server 细节和输出；
  - Command 细节：
    - command；
    - cwd；
    - exit code；
    - duration；
    - output observed；
  - HTTP 细节：
    - 页面 status；
    - content type；
    - 同源资源样本结果；
  - Browser 细节：
    - provider；
    - URL；
    - steps；
    - console errors；
    - page errors；
    - network errors；
    - screenshots；
  - MCP browser tool call 细节：
    - tool name；
    - input；
    - output preview；
    - duration；
    - error。
- 所有长文本通过 `compactText(...)` 截断，避免报告过大。
- 增强 `runTestAgentArtifactSelfTest()`：
  - 验证 `report.md` 包含 `## Command Details`；
  - 验证包含 `**Output observed:**`；
  - 验证真实命令输出 `artifact ok` 写入 Markdown。

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

## 设计说明

CC 的 verification agent 明确要求报告包含实际命令和实际输出。TestAgent 是程序化 verifier，不需要完全照搬自然语言格式，但 artifact 报告必须能让人复盘：

- 命令是否真的执行；
- 输出是否支持结论；
- 浏览器是否真的操作；
- 截图、console、network 是否留下证据；
- MCP 工具是否被实际调用。

## 未完成

- `report.md` 还没有生成可点击的本地链接格式；目前保留原始绝对路径。
- MCP screenshot 的实际文件归档仍依赖 provider 输出，尚未统一复制到 artifact 目录。
- 后续可以补一个 HTML 报告或前端展示组件，但那会涉及 UI 层，本轮保持 TestAgent 独立。
