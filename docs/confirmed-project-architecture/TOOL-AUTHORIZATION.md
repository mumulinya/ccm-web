# MCP 与 Skill 作用域授权

工具从市场安装到目录revision、权限影响和运行时重同步的流程见[MCP/Skill工具市场与目录生命周期](./TOOL-MARKETPLACE-AND-CATALOG.md)。

## 已确认结构

CCM 的 MCP 与 Skill 配置按 Agent 作用域隔离，不以“已安装”代替“已授权”：

- 群聊主 Agent和群聊项目子 Agent读取当前群聊配置，并继续叠加目标项目允许的执行边界。
- 项目主 Agent与当前项目开发 Agent只读取当前项目配置，不读取群聊或兄弟项目授权。
- 全局 Agent使用独立的全局授权文件，不继承任意群聊或项目授权，也不自动获得全部已安装工具。

三个页面都提供当前作用域的工具配置入口。项目会话和全局会话在页头直接展示已授权数量；群聊继续展示群聊工具配置。

## 全局 Agent 执行链

```text
已安装 MCP / Skill
-> 用户在全局 Agent 工具配置中明确授权
-> 服务端核验连接、工具名称、Skill hash 与缺失项
-> 只把可用授权目录写入当前全局会话模型上下文
-> 模型按完整语义决定是否调用
-> 服务端再次校验全局 scope 和授权 checksum
-> ToolManager 执行并记录调用审计
-> 结果作为工具观察返回模型
```

全局 Agent通过 `invoke_skill` 调用授权 Skill，通过 `invoke_mcp` 调用授权 MCP。Skill 本身只提供受控工作方法，由模型继续执行；MCP 可能包含外部副作用，因此全局入口统一经过写操作授权门禁。

## 群聊与项目主 Agent

- 群聊主 Agent使用当前群聊授权，项目主 Agent使用当前项目授权。
- 两者均可通过`invoke_skill`读取授权Skill，并只开放只读MCP。
- 最多两轮补充工具读取、每轮最多两个调用；重复调用、超8K Token结果和完整上下文超限均fail closed。
- 项目计划、同任务计划修订和项目分析使用同一项目工具上下文。

## 项目子 Agent继承

子 Agent运行时快照分离用户配置授权与任务内部角色Skill。群聊任务合并“群聊+项目”，项目任务只读取项目；Runner从持久任务重新计算内部Skill并验证签名、精确会话、项目、群聊、generation和运行时。完整流程见[Agent MCP与Skill注册继承流程](../confirmed-business-processes/AGENT-MCP-SKILL-INHERITANCE.md)。

## 失败策略

- 未授权的 MCP 或 Skill 直接拒绝。
- 授权项缺失、断连、需要登录或授权格式无效时 fail closed。
- 短名称对应多个 MCP 工具时拒绝执行，必须使用目录给出的完整名称。
- 上下文占用区分授权目录与真实载荷：Skill目录和延迟MCP名称计目录Token；只有实际加载的MCP Schema、调用后的Skill正文及工具结果计入对应完整载荷，不统计其他作用域或仅安装未授权的工具。
- 页面数量、就绪状态和模型上下文来自同一份服务端授权数据，不生成展示用假数据。

## 接口与存储

- 全局配置：`GET/POST /api/global-agent/tools`
- 项目配置：`GET/POST /api/projects/tools`
- 全局授权文件：`~/.cc-connect/global-agent-tool-authorization.json`
- 授权变更审计：复用 `agent-runner/tool-authorization-changes.jsonl`
- 统一授权清单：`GET /api/tools/authorization-inventory`

原始 MCP、Skill 安装配置仍由工具中心管理；作用域授权文件只保存允许列表，不复制工具实现或密钥。

## 验证

- 后端类型检查、前端生产构建和后端生产构建通过。
- 全局授权 API 返回真实安装目录与独立允许列表。
- 未授权 MCP 调用被服务端拒绝。
- 全局上下文边界校验通过，默认未配置时模型可见 MCP/Skill 均为零。
- 浏览器验证全局与项目页头入口、授权弹窗和项目原有配置弹窗正常，控制台无错误。
- 验证过程未调用付费 Provider。
# 主 Agent V2工具核心

全局、群聊和项目主 Agent共享`MainAgentToolCatalogV2`，作用域适配器只负责身份、精确会话和可读项目集合。内置`ccm__workspace_readonly`不可卸载，基础Schema默认加载，低频Schema和普通用户MCP通过`tool_search`按需进入上下文；受信`alwaysLoad`是唯一首轮例外。Skill首轮只投影目录，正文在`invoke_skill`后进入同一Agent Loop。每次调用必须验证`ScopedToolCapabilityTokenV1`；主 Agent不获得源码写入、Shell或Worktree权限。完整运行流程见[三类主Agent CC式工具体系](../confirmed-business-processes/MAIN-AGENT-CC-STYLE-TOOLS.md)。
