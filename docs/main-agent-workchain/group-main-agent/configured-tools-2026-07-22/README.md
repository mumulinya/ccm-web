# 群聊主 Agent 配置工具接入

## 目标

群聊中配置的共享文件、MCP 和 Skill 不再只服务项目子 Agent。群聊主 Agent 在当前精确 `gcs_*` 会话内也能读取共享文件、使用已授权 Skill，并按需调用已授权的只读 MCP；项目子 Agent 原有的群聊工具、项目工具和角色 Skill 合并链保持不变。

## 业务流程

```text
用户消息 + 当前 gcs_* 会话
  + 群聊共享文件正文
  + 群聊 typed memory / RAG 召回
  + 主 Agent 角色 Skill
  + 群聊配置的 Skill 目录
  + 群聊配置的只读 MCP 目录
  -> 群聊主 Agent 第一次规划
     -> 无工具请求：直接回答或生成自包含项目工作单
     -> 有工具请求：CCM 校验群聊授权、只读属性和调用预算
        -> 执行 MCP / Skill
        -> 工具结果进入同一轮模型可见上下文
        -> 群聊主 Agent 重新规划
  -> 通过容量门禁后回答或派发项目子 Agent
```

共享文件始终由群聊主 Agent 读取。项目子 Agent 不会无条件接收整份群聊文件，而是通过主 Agent 生成的自包含工作单接收与自己任务相关的接口、字段、规则、文件来源和验收要求；需要项目自身 MCP/Skill 时，继续由子 Agent 的运行时工具授权链处理。

## 授权边界

- MCP 只来自当前群聊 `group.tools.mcp`，不会继承其他群聊或无关项目的授权。
- 主 Agent 仅开放标准 `readOnlyHint=true` 或通过保守只读名称识别的工具。
- 名称包含创建、修改、写入、删除、发送、部署、执行、授权等副作用信号的 MCP 即使已配置，也不会开放给主 Agent。
- MCP 请求必须使用 Tool Manager 生成的 canonical name；Skill 只能通过 `invoke_skill` 调用当前群聊授权或当前角色选中的 Skill。
- Tool Manager 在执行时再次验证同一 `ToolScope`，Prompt 目录不是授权事实来源。
- 每轮最多请求 2 项工具、最多 2 轮；重复调用、越权调用和循环超限均 fail closed。

## 上下文与容量

- MCP/Skill 目录属于模型实际 system payload，并分别计入 `Skills` 与 `MCP & dynamic tools`。
- MCP/Skill 执行结果属于当前轮动态上下文，单项最多 `8K token`；超限结果不进入模型。
- 动态工具结果单独记录为 `mcpResults`，上下文面板将其与 MCP 工具定义合并展示，但它不进入固定上下文 usage 基线。
- 工具结果加入后会重新构建完整模型可见 payload；达到当前会话自动压缩阈值时阻止后续规划和派发。
- 共享文件正文继续计入真实 system payload，不使用虚构 Token 或固定展示值。

## 关键实现

- `backend/tools/mcp-client.ts`：保留 MCP annotations。
- `backend/tools/tool-manager.ts`：按精确授权范围生成可执行工具目录。
- `backend/modules/collaboration/group-orchestrator-llm.ts`：主 Agent 工具目录、只读过滤、两阶段调用与容量门禁。
- `backend/system/session-compaction-core.ts`：动态 MCP 结果 Token 分桶。
- `frontend/src/components/common/SessionContextUsage.vue`：将 MCP 定义和动态结果合并展示。

## 验证证据

- `npm run test:group-main-configured-tools`：通过，11 项检查覆盖共享文件、Skill、只读 MCP、写工具阻止、精确群聊隔离、重复调用、结果预算和上下文分类。
- `npm run test:group-coordination-mcp`：通过，原有项目子 Agent 协作 MCP 与多运行时注入未回归。
- `npm run test:group-main-uncompacted-cc-context`：通过，20 项检查。
- `runCollaborationProtocolSelfTest()`：通过。
- `runToolAuthorizationSelfTest()`：通过，22 项检查。
- `runToolManagerRuntimeSelfTest()`：通过，17 项检查。
- `node scripts/session-context-component-breakdown-selftest.mjs`：通过。
- `node scripts/session-context-usage-ui-selftest.mjs`：通过，25 项检查。
- `npm run build:backend`、`npm run build:frontend`：通过。

`npm run test:runtime-tools` 的底层 Tool Manager、授权、运行时同步等检查均通过，但整套脚本仍被已有 `projectToolUi` 源码正则断言拦截；该断言针对项目工具页面源码形态，与本次主 Agent 工具执行链无关。

全部测试使用本地自测或 mock 执行器，付费 Provider 调用为 `0`。
