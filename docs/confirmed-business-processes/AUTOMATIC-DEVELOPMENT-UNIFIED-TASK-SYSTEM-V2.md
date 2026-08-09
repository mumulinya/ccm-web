# 自动开发统一任务系统 V2

本文记录全局 Agent、任务派发、工作台、群聊会话和项目会话进入同一套自动开发任务系统后的完整生产流程。它不是单项修复清单，而是当前代码真实执行的统一任务链。

## 一、统一入口与任务身份

支持的业务入口包括：

- 全局 Agent 接收业务目标、附件、图片或在线文档，并选择目标群聊或项目。
- 任务派发和需求池直接指定群聊、项目及精确会话。
- 我的工作台向指定群聊或项目提交业务描述。
- 群聊主 Agent 或项目主 Agent 在当前会话中识别开发任务。
- 旧版群聊任务拆分接口继续兼容，但创建结果必须进入同一套持久任务与队列。

所有新任务创建 `TaskIntakeIdentityV2`。身份绑定来源通道、目标类型、目标 ID、精确会话、`client_message_id` 和内容 checksum。一次网络重试或重复点击复用原任务；用户再次发送相同文字、发送到其他会话或其他项目时创建新任务。服务端不再按需求文字做五分钟模糊去重。

缺少 `client_message_id` 的旧客户端由服务端生成请求级 ID，因此不会跨请求误复用。项目和群聊公共接口会先核验精确会话归属，底层任务服务只保存通过门禁的作用域身份。

## 二、模型规划与任务图

自然语言是否属于开发任务、目标项目、拆分方式、验收标准和风险语义均由统一模型决策运行时生成结构化回执。本地确定性代码只核验 ID、作用域、路径、权限、Token、checksum 和结构化状态。

群聊主 Agent 先读取所管理项目的目录、配置、定义、引用和相关源码，再由模型形成源码证据、影响项目、模块边界、依赖图、工作项及验收标准。候选路径评分只用于发现候选，不能替代模型选择。源码证据不足、模型不可用、项目越界或源码 checksum 变化时停止派发并重新规划或等待用户。

项目主 Agent 只读取当前项目并生成当前项目工作项。项目计划使用服务端权威消息 `project-main-task:<task_id>` 持久更新；刷新、SSE 断线和重新进入页面会恢复同一任务，而不是创建第二张任务卡。

## 三、统一队列与工作区互斥

普通任务执行同时经过两层串行控制：

1. 精确会话队列：`group_id + group_session_id` 或 `project_id + project_session_id` 内严格串行。
2. 工作区变更通道：不同会话只要修改同一个真实源码目录，也必须按目录串行。

高优先级任务可以插到等待队列前面，但不会打断正在执行的任务。任务只有进入 `done`、`failed`、`blocked` 或 `cancelled` 后才释放会话队首。等待补充资料会转为 `blocked/needs_user`，不会留下游离的 `in_progress`。

项目主 Agent 的 `/api/send-stream` 不再绕过队列直接执行；群聊项目子 Agent 与项目主 Agent 共用工作区互斥。重复调度同一活跃任务会返回当前队列状态，不启动兄弟执行副本。

隔离协作是明确例外：`queue_scope=isolated_parallel` 在基础仓库短时锁内创建 worktree 后，使用 `worktree:<absolute-path>` 独立执行通道，不继续占用项目主目录 lane。单项目默认最多2个、全局最多6个第三方 Agent；达到上限保持排队并展示容量原因。

队列状态、位置、工作区通道和调度回执写入任务与回放。进程重启后，无法重建内存执行闭包的旧 `queued/running` 项目任务会进入 `recovery_required`，系统不会假装继续执行或重复修改源码。

## 四、开发、协作与验收

主 Agent 只负责理解、规划、派发、权限、跟踪和验收，源码修改由项目子 Agent 完成。群聊任务可以协调多个项目；项目会话任务只操作当前项目的开发 Agent。不同项目协作由群聊主 Agent 创建独立工作项并合并结构化回执，不允许子 Agent 直接跨项目写入。

开发 Agent 的进程退出码为 0 只表示执行结束。代码或文件变更还必须经过 TestAgent 独立验收；关闭 TestAgent 时改为主 Agent 自验，页面、回放和最终交付不得声称经过独立验收。失败返工继续绑定原任务，最多三轮，不创建无限兄弟任务。

TestAgent、Agent 回执和执行器只能通过结构化字段影响状态。生产代码不再从 `passed`、`失败`、`可以继续` 等自由文本猜测完成、失败或返工结论。缺失结构化回执时任务等待或阻塞。

第三方 Agent 通信使用 [Agent Communication V2](./AGENT-COMMUNICATION-V2.md)：派发前创建 Dispatch 和 lease，Runner启动后等待ACK，执行期写系统心跳，Agent只提交Result，CCM通过验收后生成Terminal。旧generation、attempt、lease或跨会话回执只进入`stale_receipt`审计。

## 五、统一终态门禁

自动开发任务不能通过通用状态更新接口直接改成完成。所有完成请求经过同一个终态门禁，核验工作项、权限、源码证据、TestAgent或自验、交付摘要和风险决策。

| 结果 | 任务状态 | 验收状态 |
| --- | --- | --- |
| 证据完整并通过验收 | `done` | `accepted` |
| 执行或验收失败 | `failed` | `rejected` |
| 等待用户或恢复 | `blocked` | `blocked` |
| 用户取消 | `cancelled` | `cancelled` |

低风险且全部门禁通过时可以系统自动验收；中高风险、发布、破坏性操作、跨项目请求或证据不足时等待用户批准。自动与人工验收调用同一完成函数，并生成 `ccm-task-terminal-decision-v2`、终态门禁摘要和决策主体。旧终态任务没有该回执时只显示“历史状态无法证明”，不补造验收证据。

## 六、用户展示与任务回放

任务卡持续展示需求、资料读取、计划、队列位置、当前阶段、正在执行的 Agent、验收方式、返工轮次、需要用户处理的事项和最终交付。全局 Agent 显示路由、拆分、派发和下游跟踪；群聊与项目主 Agent 显示规划、开发、验收和交付，避免角色混淆。

任务回放聚合原始需求、`TaskIntakeIdentityV2`、计划与修订、源码证据、队列和工作区锁、开发回执、文件变化、验证命令、TestAgent报告、权限、终态门禁及通知结果。Provider、session、generation、MCP 和 Skill 等技术字段放入折叠排障信息。

最终回复只回传原来源会话。Web、飞书、兄弟会话和兄弟项目之间不会串线。只有验收通过后的稳定决定、约束、结论和未完成事项可以进入长期记忆候选。

## 七、故障恢复边界

- 队列执行使用最外层 `try/finally` 释放运行标记和工作区通道。
- Fire-and-forget 异常会写入时间线并触发一次受控唤醒，不产生未处理 Promise 循环。
- 租约、SQLite、通知和回调失败不能把任务永久卡在进行中。
- Provider 重试受统一超时、五次上限和任务级熔断约束。
- TestAgent 返工有明确轮次上限，相同证据不会无限重派。
- 服务重启后只恢复能够证明归属的持久状态；无法证明时 fail closed。
- Agent Communication watchdog每5秒核对60秒启动、30秒ACK、20秒心跳、90秒失联和120秒租约；副作用不确定时进入`recovery_required`，不自动重跑。

## 八、实现入口

- 任务身份与终态门禁：`backend/modules/collaboration/collaboration-task-service.ts`
- 任务公共接口：`backend/modules/collaboration/collaboration-routes.ts`
- 统一调度器：`backend/system/unified-task-scheduler.ts`
- 群聊运行协调：`backend/modules/collaboration/collaboration-runtime-coordinator-review.ts`
- 项目主 Agent：`backend/modules/projects/project-main-agent.ts`
- 项目入口调度：`backend/server.ts`
- 旧群聊拆分兼容：`backend/modules/collaboration/group-live-routes.ts`
- 任务回放：`backend/modules/collaboration/task-replay.ts`
- Agent通信账本与API：`backend/system/agent-communication-v2.ts`、`backend/system/agent-communication-api.ts`
- 用户任务体验：`frontend/src/utils/taskExperience.js`

## 九、上线验证

- 自动开发生产链自检验证作用域幂等、相同需求再次提交、旧客户端无文本去重、终态门禁、自由文本隔离、会话串行、跨会话工作区串行、租约异常释放和风险验收。
- V2生产审计验证所有新任务身份、项目真实排队、中央终态门禁、旧拆分入口和中断恢复。
- 项目主 Agent编排回归通过35项检查；统一自动开发工作流通过16项检查；语义路由生产审计通过19项检查。
- 上述自检全部使用本地夹具或Mock，付费Provider调用为0。
- 任务域完整回归通过20个测试入口，快速全域回归通过24个测试入口，均为0失败。
- frontend、backend和飞书MCP production build全部通过；文档检查验证1194条链接、0失败。
- 本地服务已使用新构建重启，`http://127.0.0.1:3080`返回200；任务API审计验证37项路由契约及任务列表、执行看板、队列、看门狗、需求池、Agent运行和任务回放实时接口。

本轮不发布npm，验证通过后进入下一次统一发布候选。
