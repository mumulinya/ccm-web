# Agent MCP 与 Skill 注册继承完整业务流程

## 用户配置到真实调用

```text
安装 MCP / Skill
-> 在全局、群聊或项目页面明确授权
-> 服务端规范化授权并检查连接、工具名和 Skill hash
-> 主 Agent注册模型可见目录，或为项目子 Agent生成运行时快照
-> 启动前按精确作用域重新核验
-> Agent按模型语义调用
-> 调用结果进入隐藏执行账本、运行时回执和审计
```

“已安装”不等于“已授权”，“页面显示已配置”也不等于“Agent已经调用”。授权清单、运行时注册和真实调用证据分别展示。

## 精确作用域

| Agent | 配置来源 | 实际交付方式 |
| --- | --- | --- |
| 全局 Agent | 仅全局工具配置 | CCM模型工具目录；Skill使用`invoke_skill`，MCP使用`invoke_mcp`并经过权限门禁 |
| 群聊主 Agent | 仅当前群聊配置，加当前轮内部规划Skill | Skill与只读MCP进入主Agent受控工具循环 |
| 项目主 Agent | 仅当前项目配置，加当前轮内部规划Skill | 计划、计划修订和项目分析均可使用Skill与只读MCP |
| 群聊项目子 Agent | 当前群聊配置、目标项目配置、任务内部角色Skill | 按Claude Code、Cursor、Codex、Antigravity CLI、OpenCode或Qoder生成原生配置；工具级MCP走CCM代理 |
| 项目会话子 Agent | 当前项目配置、任务内部角色Skill | 与群聊子Agent相同，但不读取群聊或兄弟项目授权 |
| TestAgent | 独立只读验收工具 | 不继承开发Agent的写入MCP或项目Skill |

群聊和项目主 Agent不会直接获得写入型MCP。需要改代码或产生外部副作用时，由项目子 Agent及权限审批链执行。全局 Agent的MCP调用保持既有高风险审批规则。

## 主 Agent工具循环

群聊和项目主 Agent默认只接收授权MCP canonical name；`tool_search`命中后才把功能和完整参数Schema加入当前上下文。`auto`在MCP定义不超过上下文10%时内联，`inline`明确全部内联。Skill目录按上下文1%动态预算保留全部名称，简介按优先级裁剪，不预先加载Skill正文。模型补充读取、重复去重和结果注入都重新经过Provider Token容量门禁。

命令中心的`/mcp`和`/skills`也遵守同一作用域：全局入口只读取全局授权，项目入口只读取当前项目授权，群聊入口只读取当前群聊授权。无作用域的`/api/mcp`与`/api/skills`仍供管理页面读取完整注册目录；命令中心不得用完整目录冒充当前Agent可用工具。已授权但注册项缺失的名称单独作为`missing`返回，不能显示为可用。

Skill只能通过`invoke_skill`按授权名称读取。MCP只能使用目录给出的完整canonicalName。未授权、断开、需要登录或可能写入的工具不会执行，也不能被模型描述为已经执行。

项目主 Agent工具调用写入当前精确项目会话的隐藏执行账本；群聊主 Agent使用当前精确群聊上下文。工具过程不生成用户聊天气泡，正式结论仍由主 Agent回复。

## 子 Agent运行时快照

子 Agent使用`RuntimeToolAuthorizationSnapshotV2`：

- `configuredTools`保存群聊和项目的用户授权。
- `executionRoleSkills`保存当前任务模型选择及角色必需的CCM内部Skill。
- `effectiveTools`必须等于两者并集。
- 快照绑定项目、群聊、精确会话、任务、任务Agent会话、native generation和运行时。
- 快照由CCM私有密钥签名，并绑定catalog revision。

Runner启动前重新读取当前群聊与项目配置，只将其与`configuredTools`比较；随后从持久任务重新计算内部角色Skill。这样既不会把合法角色Skill误判为越权，也不能伪造额外Skill。签名、任务、会话、项目、群聊、generation、运行时、配置或并集不匹配时均拒绝启动。

完整Server授权可进入第三方CLI原生MCP配置；仅授权单个子工具时使用CCM代理，避免原生客户端获得整个Server。缺失工具会阻止派发，空授权则正常运行。

每个正式第三方开发工作还会注入签名的 `ccm__agent_communication`。它提供接单ACK、进度、心跳、协调/评审请求、阻塞报告、状态查询和Result提交；调用绑定精确任务、会话、generation、attempt和lease。旧 `ccm__group_coordinator` 是兼容别名，TestAgent没有开发转派权限。详见 [Agent Communication V2](./AGENT-COMMUNICATION-V2.md)。

## 内置网页MCP

`fetch-web-mcp`随CCM Node安装包发布，不再依赖Python `mcp-server-fetch`或不存在的npm包。旧CCM官方定义惰性迁移，用户自定义同名工具保持不变。

网页读取只接受公开HTTP/HTTPS，逐次校验DNS和重定向，拒绝localhost、局域网、私有地址和非文本内容，并限制超时、响应体和返回文本。Server名`fetch-web-mcp`及工具名`fetch`保持兼容。

## 状态与失败处理

- 统一授权清单同时展示全局、群聊、项目、主Agent能力和子Agent运行时覆盖。
- 项目工具弹窗区分“项目主Agent可调用”和“项目子Agent派发时注册”。
- MCP失败状态包含脱敏、限长的真实stderr摘要。
- 旧快照或catalog变化显示“需要重同步”；重同步不启动Agent、不调用Provider。
- 原始授权、任务、会话、工具回执和审计不因升级删除。

## 验证证据

- 项目主Agent配置Skill、只读MCP、写入MCP隔离和真实工具执行专项测试通过。
- 子Agent V2快照接受合法配置与内部Skill，拒绝伪造Skill、配置漂移和跨会话请求。
- 六种第三方Agent运行时的原生/代理注册与签名协作MCP回归通过。
- 内置网页MCP完成真实JSON-RPC发现、公开网页读取和内网阻断验证。
- 验证不调用付费Provider。
