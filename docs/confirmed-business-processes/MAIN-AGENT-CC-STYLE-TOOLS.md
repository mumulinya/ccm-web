# 三类主 Agent CC 式工具体系完整流程

## 1. 适用角色

全局 Agent、群聊主 Agent和项目主 Agent保持独立会话、记忆、队列与权限身份，但共同使用 `MainAgentToolCatalogV2`。项目子 Agent继续使用第三方CLI的编辑和Shell能力；TestAgent继续保持只读验收边界。

## 2. 完整调用链

```text
用户消息
→ 精确会话串行队列
→ Context Engine容量门禁与必要正式压缩
→ 主 Agent首轮模型理解
→ 直接回复，或选择基础只读工具
→ tool_search按需加载低频Schema
→ 服务端复核ScopedToolCapabilityTokenV1
→ 工具执行与Token门禁
→ 安全只读批次并行；副作用、Skill与发现操作串行
→ tool_result写入同一Agent Loop，有进展则动态续环
→ 形成回答、计划、澄清或任务派发
```

普通问候和自包含问答不会预读源码、知识库、运行日志或Skill正文。首轮只包含Skill目录和延迟MCP名称；普通配置MCP不会把完整Schema提前写入提示词。项目计划和项目分析不再先调用独立“工具选择模型”；首轮主 Agent直接决定是否需要工具。

## 3. 工具分层

原生控制能力包括结构化澄清、Todo、计划模式、Skill调用、工具发现和现有任务状态机。澄清、Todo和计划通过主 Agent结构化决策字段进入现有状态机；它们不是可以绕开权限的任意执行接口。

项目与群聊不再使用固定总工具轮数作为正常终止条件。每轮默认最多两个请求仅控制批量大小；只要出现新的工具签名、有效结果或未满足验收项，主Agent可以继续下一轮。历史`agentToolCallBudget`和`agentMaxModelTurns`在默认`adaptive`模式中是续环分段大小，用于审计和上下文重建；只有显式切换`bounded`兼容模式时才是硬上限。

`ccm__workspace_readonly`提供12项受保护能力：目录、Glob、Grep、分段Read、定义、引用、项目配置、Git状态、Git差异、Git历史、运行状态和运行日志。基础四项Schema进入首轮上下文，其余八项先由`tool_search`发现并加载。

用户授权MCP默认与Claude Code一致地延迟加载：首轮只提供canonical名称，`tool_search`结果才携带完整JSON Schema，并在同一Run后续轮次持续可用。只有受信目录中明确声明`anthropic/alwaysLoad`的工具可以首轮加载；普通外部Server不能靠名称或未受信元数据强制占用上下文。

Skill首轮只提供名称、说明和内容hash。完整`SKILL.md`只在模型选择并调用`invoke_skill`后作为工具结果进入同一Agent Loop；未调用Skill不计正文Token。任务状态机内部根据已完成模型决策装载的角色方法仍保留独立审计，但不能在普通问候首轮预注入。

定义和引用只有项目语言服务能够给出可证明结果时才成功；没有语言服务时返回`capability_unavailable`，不会用关键词匹配冒充语义结果。Web搜索只有存在真实搜索后端时才注册。

## 4. 作用域与安全

- 全局 Agent读取源码时必须指定已激活的精确项目。
- 群聊主 Agent只能读取当前群聊可路由成员项目。
- 项目主 Agent固定读取当前项目，模型参数不能切换到兄弟项目。
- 每次工具调用重新验证作用域、精确会话、generation、允许项目和有效期。
- 路径逐段执行`lstat/realpath`校验，拒绝符号链接、Junction、路径逃逸和敏感文件。
- 工具结果按真实Token预算返回完整条目或完整行；超限时要求使用cursor继续读取，不做字符截断。
- 外部MCP只有被当前作用域明确授权、声明只读且通过可信目录投影后才能提供给主 Agent。写入或副作用工具默认拒绝。

主 Agent不注册`Edit`、`Write`、`Bash`、`NotebookEdit`或`Worktree`。实际源码修改、命令和工作树操作仍由项目子 Agent执行，并经过任务、RBAC、TestAgent和最终验收门禁。

并行只采用正向证明：工作区只读工具、内置知识检索或`annotations.readOnlyHint=true`且可信的MCP可以在同一小批次执行，结果按请求顺序返回。`tool_search`会改变本轮目录，`invoke_skill`会改变Skill连续性，写入或未知MCP可能产生副作用，因此这些调用与其前后批次之间保持串行屏障。

## 5. 上下文、记忆与回放

页面和API区分“已授权但未加载”“已加载Schema”和“已实际调用”。延迟目录只按名称投影计算Token，完整Schema只在`alwaysLoad`或ToolSearch加载后计算，工具结果只在真实调用后计算。Context Engine只统计本轮真实载荷；调用与结果保持成对写入精确会话隐藏执行账本，旧结果仅在满足MicroCompact条件时压缩。聊天正文不展示源码原文或内部协议。

原生路径的 `policy_prompt` 只写工具短名称和一句说明，不再把 JSON Schema 再写进政策提示；完整 Schema 只出现在本轮 `tools` 数组。JSON 退化路径仍在政策文本中携带参数 Schema。群聊/项目原生 `tools` 数组包含 `tool_search` 与 `invoke_skill`，工作区工具使用短名称。全局低频管理工具默认延迟，需先 `tool_search` 再调用。

超过 50_000 字符的工具结果写入 `~/.cc-connect/tool-results/{scope}/{sessionId}/`，模型上下文只保留约 2KB 冻结预览和 `<persisted-output>`；同一 `tool_call_id` 的预览字节级稳定。`read_file`、已有工作区引用和图片块不落盘。单轮并行结果合计超过 200_000 字符时从最大新鲜结果开始落盘。原生 transcript 应用投影算出的 MicroCompact 清理/替换，不把完整执行账本重新灌进模型；time-based MicroCompact 默认关闭，与 Claude Code GrowthBook 默认一致。

正式压缩成功后，三类主Agent使用同一份`MainAgentPostCompactRestoreManifestV1`恢复动态工具状态：

1. 只有存在真实`invoke_skill`回执的Skill才记录内容checksum，并在新Run中重新读取、校验后恢复正文。
2. 只有通过`tool_search`实际加载的MCP Schema才进入恢复清单；未加载的延迟工具仍只保留可搜索名称。
3. `alwaysLoad`工具由当前可信目录自然加载，清单只核验其连续性，不重复注入Schema或重复计算Token。
4. 恢复前重新核验Agent、scope、精确session、generation、授权、目录revision、连接状态和checksum；任一项漂移即降级为未加载或不可用。
5. 恢复后的Skill正文和MCP Schema加入完整payload并再次执行真实Token门禁；超限时按最近调用顺序退回延迟加载，绝不按字符裁剪。

恢复清单只保存身份、checksum、Token和调用证据，不保存Skill正文、Prompt、密钥或MCP敏感配置。原始transcript、隐藏执行账本和工具结果不会因压缩或恢复被修改。

`tool_activity`回执包含作用域、来源、加载状态、结果Token、耗时、结果checksum和状态。历史任务仍识别旧工具名，新调用统一使用V2名称。

## 6. 失败处理

能力令牌无效、过期、跨作用域、工具未加载、结果超Token、MCP断开、敏感路径或语言服务不可用均失败关闭。失败结果返回同一Agent Loop，模型只能说明限制、继续缩小读取范围或向用户澄清，不能声称已经读取或完成。重复签名不重放工具；连续无进展达到阈值时写`no_progress`并停止，防止API空转。

## 7. 实现与验证入口

- `backend/tools/main-agent-tool-runtime.ts`
- `backend/tools/tool-result-storage.ts`
- `backend/agents/global/global-tool-load-policy.ts`
- `backend/agents/native-session-transcript.ts`
- `backend/system/main-agent-post-compact-continuity.ts`
- `backend/tools/workspace-readonly-tools.ts`
- `backend/integrations/workspace-readonly-mcp.ts`
- `backend/modules/global/global-agent-agentic-runtime.ts`
- `backend/modules/collaboration/group-orchestrator-llm.ts`
- `backend/modules/projects/project-main-agent.ts`
- `scripts/main-agent-cc-tools-selftest.mjs`
- `scripts/cc-tool-context-parity-selftest.mjs`
- `scripts/main-agent-post-compact-continuity-selftest.mjs`
- `scripts/agent-tool-inheritance-selftest.mjs`
- `scripts/internal-mcp-catalog-selftest.mjs`

自动化验证不调用付费Provider。

## 8. 页面回传

工具不再只以聚合计数出现在页面。全局、项目、群聊会将每个工具开始、完成或失败投影成统一安全事件，展示名称、目标、状态、耗时和结果摘要；Skill fork与项目子Agent使用CC式紧凑Agent行。完整页面协议和安全边界见 [CC-STYLE-USER-VISIBLE-EXECUTION-FLOW.md](./CC-STYLE-USER-VISIBLE-EXECUTION-FLOW.md)。
# 2026-08-09 CC级工具升级

当前实现已增加真实 TS/JS Language Service、项目增量符号索引、定义/引用/实现/类型/调用层级/诊断工具、ToolSearch V2 多维评分、三类 Provider 原生工具归一化、Skill `context: fork`、Notebook结构化工具和安全Web工具。完整确认流程见 [CC-LEVEL-CODE-INTELLIGENCE-AND-TOOLS.md](./CC-LEVEL-CODE-INTELLIGENCE-AND-TOOLS.md)。语义服务缺失时必须返回 `capability_unavailable`，不得用 Grep 伪造语义关系。
