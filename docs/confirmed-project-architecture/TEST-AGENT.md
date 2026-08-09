# TestAgent 智能独立验收

## 定位

TestAgent 是独立验收 Agent，不是第二个开发 Agent。它可以像开发 Agent 一样读取当前源码、选择检查、运行命令和使用 Playwright，但不能编辑业务代码、测试代码、配置或依赖，也不能为了让结果通过而降低断言。

全局开关只在任务创建时读取一次，并固化为带checksum的任务级验收策略。关闭后不会启动TestAgent，而是由群聊或项目主Agent执行一次结构化自验：只运行项目已配置的安全验证命令，模型只能分析真实证据ID，最终通过由确定性门禁计算。完整流程见[TestAgent独立验收与主Agent自验](../confirmed-business-processes/TEST-AGENT-AND-MAIN-AGENT-SELF-VERIFICATION.md)。

## 执行流程

1. 群聊主 Agent或项目主 Agent将用户目标、验收标准、变更文件和受控交付工作区交给 TestAgent。
2. 智能规划层读取当前 `package.json` 脚本、变更文件、相关源码片段和可测试 URL。
3. 模型输出结构化命令、HTTP 检查和 Playwright 检查建议。
4. CCM 重新校验所有路径、URL、命令、浏览器动作和断言；危险命令在执行前删除或阻止。
5. 现有确定性执行器实际运行命令、HTTP 和浏览器检查，收集退出码、输出、动作前后截图、断言截图引用、控制台、网络及工具调用证据。
6. 出现失败、阻断或没有证据时，模型可以基于真实结果补充一轮聚焦命令和浏览器检查；已执行检查不得重复，补充检查只作为诊断证据，不能篡改首轮冻结计划。
7. 现有证据门禁计算通过、返工或需要人工判断。模型没有最终裁决权。
8. 智能模型超时、连接失败或返回无效JSON时按冻结风险等级降级：lightweight执行既有检查，standard要求每条标准已有明确检查映射，interactive还要求预声明交互检查、隔离环境和测试租户，critical阻塞。非法handoff、权限越界、覆盖缺失和安全校验失败始终fail closed。
9. 项目和群聊共用`ccm-test-agent-completion-gate-v2`；规划、隔离、真实变更面、证据、只读能力、源码/运行时新鲜度和完成前抽查任一失败都不能完成任务。
10. V2公共硬化投影同时提供规划降级、隔离/副作用阻断、未声明变更、投影拒绝、运行时漂移、抽查失败和只读能力拒绝八类无正文进程指标。

## 风险分级与失败路由

- 主 Agent由模型根据完整需求语义选择轻量、标准、交互或关键验收；本地代码不使用关键词或正则代替语义分级。
- 新项目任务的验收标准必须同时声明可观察结果、验收对象和证据类型，结构不完整时 fail closed。
- 真实执行失败才返回原开发 Agent返工；证据未知或偶发不稳定由 TestAgent增量复验；凭据、服务、启动条件和超时归为环境阻塞。
- 第二轮及后续复验聚焦失败标准、失败命令和失败浏览器步骤，并保留一项已通过的核心回归检查。
- 已配置的项目或群聊测试目标是最低验收约束，模型不得通过选择较低等级删除这些检查。

完整策略见 [TestAgent 风险分级、证据路由与增量复验](../main-agent-workchain/test-agent/risk-tier-evidence-routing-and-incremental-recheck-2026-07-26/README.md)。

## 群聊测试目标

- 测试目标在群聊页面配置，并且必须绑定该群聊已有项目。
- 一个项目可以有任意数量和名称的目标，不固定为 App 或 Admin；可表示 Web、H5、API、混合应用、原生应用或其他入口。
- 每个目标独立保存环境、URL、启动命令、验证命令和认证方式。
- 群聊主 Agent 可通过验收 MCP 读取无凭据目标清单并选择目标；“每次验收必测”目标不能被选择结果排除。
- TestAgent 模型看到目标档案和登录字段的环境变量名，凭据值只在 worker 执行前解密。
- 一个项目的多个目标会展开成多个独立验证单元，但项目级构建和验证命令只在首个目标执行一次，目标专属命令分别执行。
- 配置 checksum 在创建工单和实际执行之间发生变化时，旧工单失效并要求重新规划。

## 项目测试目标

- 项目管理页面的“测试目标”维护当前项目自己的验证入口和唯一登录配置，不依赖群聊配置。
- 项目目标使用与群聊目标相同的类型、认证、checksum 和凭据保护规则，但作用域固定为当前项目。
- 登录路径表示前端页面路由；账号凭据会转换为正式浏览器登录步骤，真实值只在 TestAgent 子进程中以临时环境变量解密。
- 项目目标支持账号凭据、项目目录内的 Storage State 和已有浏览器会话；登录失败或认证执行器不可用时必须阻塞验收。
- 群聊测试目标不保存另一份用户名或密码；它按照目标绑定的项目读取项目登录配置。项目配置变化后，依赖该项目的群聊验收计划同时失效并重新规划。
- 项目主 Agent只能把当前项目目标、真实变更和验证证据交给 TestAgent，不能读取兄弟项目或群聊目标。
- 代码或文件修改默认要求 TestAgent；失败后返回原开发 Agent返工并重新复验，最多三轮。

详细流程见 [项目 TestAgent 登录态验收](../main-agent-workchain/project-main-agent-authenticated-test-targets-2026-07-24/README.md)。

## 能力边界

- 可以：读取当前代码、识别变更范围、选择已有测试/构建命令、设计 Playwright 操作与断言、检查 HTTP、截图、控制台和网络错误。
- 不可以：修改任何项目文件、安装依赖、提交代码、执行写入型 Git 命令、访问未授权生产 URL、绕过证据门禁。
- native TestAgent只获得签名且绑定scope的verification/read-only Skill摘要和只读MCP名称、功能、参数Schema；业务写工具、部署工具和开发Agent通用工具不会注入。
- 完整命令输出、HTTP响应和浏览器结果只在当前验证Loop使用；handoff、Runner、任务账本、timeline、回执和API只保存checksum、长度、退出码、artifact/criterion引用与`contentStored:false`。
- 使用独立TestAgent模式的任务保留原始报告、Verdict 和 artifact manifest，可供对应主 Agent抽查；关闭TestAgent的任务只保存主 Agent自验证据，不伪造TestAgent报告。
- 主 Agent通过签名 `get_test_evidence` MCP工具按 task、run和 artifact ID读取截图或文本证据；MCP不能跨任务读取，也不能修改证据。
- 浏览器验收工单支持显式 `browser_scenarios`；自然语言验收标准必须先由模型生成结构化交互流程，并保持每条标准与动作、断言、截图的来源关系。

该智能模式由群聊和项目主 Agent的正式 TestAgent验收工作单默认启用；测试脚本和低层直接调用只有显式设置 `agenticPlanning: true` 才启用，避免测试套件意外调用付费模型。

浏览器证据、MCP读取和返工复验的确认实现见 [TestAgent 浏览器证据与返工复验](../main-agent-workchain/test-agent/browser-evidence-and-rework-verification-2026-07-26/README.md)。
