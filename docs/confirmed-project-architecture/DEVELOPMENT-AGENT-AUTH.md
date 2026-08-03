# 开发 Agent 认证与运行时

## 适用范围

独立项目开发 Agent和群聊项目子 Agent统一支持 Codex、Cursor、Antigravity CLI、OpenCode和Claude Code。为兼容历史任务，Antigravity的内部运行时ID继续使用`gemini`，但生产命令统一为`agy`。开发 Agent认证与主 Agent对话模型配置分离，凭据不能跨Provider回退或串用。

## 状态模型

- `未安装`：本机没有可用CLI。
- `未登录`：没有发现认证来源。
- `待验证`：发现凭据或外部配置，但尚未证明当前账号、模型和CLI版本可以完成真实调用。
- `已登录/可使用`：原生状态或随机challenge测试生成了有效认证证据。
- `测试失败`：最近证据明确失败；任务派发失败关闭。

凭据文件存在不等于可用。认证证据绑定Provider、账号指纹、模型、CLI版本、时间和checksum，不保存Token、Prompt或原始模型回复。

## Provider

- Codex：使用本机Codex账号，任务在隔离`CODEX_HOME`中运行，并显式传递用户选择的模型。
- Cursor：使用Cursor Agent原生登录状态和账号模型目录；原生status可以形成验证证据。
- Antigravity CLI：使用官方`agy`及其安全账号状态；CCM不截获Google授权码。模型目录来自`agy models`，真实challenge通过后才允许派发任务。
- OpenCode：登录时由用户选择Provider和认证方式，不固定为OpenAI；模型目录和任务配置绑定当前Provider身份。
- Claude Code：使用加密保存的Anthropic兼容API配置、模型和凭据类型；远程Base URL必须为HTTPS，本机loopback可使用HTTP。

## 安装、测试与派发

1. 设置页通过服务端白名单命令安装或更新CLI，安装任务持久化并可在服务重启后识别中断状态。
2. Codex等支持设备授权的CLI只暴露允许的浏览器URL和设备码；Antigravity登录在官方交互终端内完成，CCM不接收Google授权码。
3. 测试使用一次性随机challenge和结构化最终助手消息；Prompt回显、日志回显和普通stdout不能伪造成功。
4. 动态模型目录按账号、版本和认证证据缓存，并用Singleflight合并并发读取；旧响应不能覆盖新选择。
5. 派发前再次核验安装、认证证据、模型、工具授权快照和项目作用域。

## 安全边界

- API Key进入AES-256-GCM凭据仓库，公开接口只返回脱敏状态。
- 设置变更只影响新任务和新generation，不热替换正在运行的进程。
- 超时会终止完整进程树；Windows使用进程树终止，POSIX使用独立进程组。
- Agent认证不会放宽MCP、Skill、项目路径、记忆或权限门禁。

完整认证状态和验证流程见[开发Agent认证与可用性V2](../confirmed-business-processes/DEVELOPMENT-AGENT-AUTHENTICATION-V2.md)。
