# CCM 当前状态

- 全局Agent运行体系已升级为V2：Web、兼容聊天接口和飞书统一进入服务端权威精确会话队列；普通写操作使用绑定用户、来源、会话、消息、目标和工具范围的单轮授权回执，高风险始终等待用户确认。超大上下文按完整轮次执行正式模型分段压缩，任一失败不推进边界；Mission终态先持久化，再由发件箱向Web、飞书、回放和长期记忆分别投递并支持跨重启重试。完整流程见[全局Agent运行体系V2](./confirmed-business-processes/GLOBAL-AGENT-RUNTIME-PRODUCTION-V2.md)。

本文只记录当前可依赖的产品结构。详细协议和业务边界以 [确认项目结构](./confirmed-project-architecture/README.md) 为准，历史实现过程从 [归档索引](./archive/README.md) 查找。

## 核心工作链

- 需求池、文档、图片与附件摄取已升级为V2：Multipart按流执行64 MB请求、10文件、单文件25 MB和合计60 MB门禁；公网文档固定已核验IP并逐次校验重定向；正文按真实Token生成完整分片，图片保存视觉checksum回执。需求与计划必须引用当前任务的来源checksum和分片，必需资料未完整覆盖时禁止确认与派发。需求池使用revision、租约和fencing token原子认领，在线快照仅在用户显式刷新时更新；清理中心只删除24小时以上且无任务引用的孤立上传。完整流程见[需求资料摄取完整流程V2](./confirmed-business-processes/REQUIREMENT-INGESTION-END-TO-END-V2.md)。

- 本地认证与访问安全已升级为V2：新安装使用24小时一次性安装码原子创建首个Admin，不再自动生成随机管理员；旧`user`惰性迁移为Viewer。全部API经过中央Viewer/Operator/Admin能力门禁，浏览器修改请求使用CSRF和客户端指纹会话，内部Agent、飞书和CLI改用30秒HMAC与一次性nonce，旧无Cookie loopback和ACP头旁路已删除。登录限流跨重启持久化，Host/CSP等安全头覆盖静态与API响应。完整流程见[本地认证、RBAC与访问安全](./confirmed-project-architecture/LOCAL-AUTH-AND-SECURITY.md)。

- 已完成生产代码、前端页面、API、CLI和测试域的全量确认文档盘点，并补齐本地认证、全局Agent、需求资料摄取、定时开发、Git代码工作区、终端、可靠性监控与清理、会话搜索与回放、模板/命令/共享文件、工具市场、桌面宠物、工作台导航、CLI生命周期和音乐媒体平台等缺失业务域。完整索引见[项目结构与业务流程覆盖矩阵](./confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md)。

- 开发Agent认证已升级为V2：凭据文件仅表示“待验证”，结构化随机challenge或Provider原生status通过后才生成可执行证据；OpenCode支持选择Provider，Gemini退出会报告剩余凭据来源，Claude远程API强制HTTPS，模型目录使用Singleflight与请求generation。完整流程见[开发Agent认证与可用性V2](./confirmed-business-processes/DEVELOPMENT-AGENT-AUTHENTICATION-V2.md)。

- 飞书双向会话已收口为全局Agent和项目主Agent两个正式入口：WebSocket/ACP与事件回调共享V2精确身份和持久幂等，同群不同话题隔离，排队消息保存原消息与话题上下文，业务回复只回原会话并最多重试五次。项目飞书在后台任务占用会话时不再返回409，而是进入精确项目会话FIFO，租约释放或服务重启后自动恢复。群聊不再建立飞书会话或绑定；全局飞书分派给群聊的任务仍沿原全局来源回执返回。完整流程见[飞书全局与项目Agent双向会话V2](./confirmed-business-processes/FEISHU-GLOBAL-PROJECT-BIDIRECTIONAL-V2.md)。

- TestAgent验收模式已完成任务级生产化收口：任务创建时固定独立TestAgent或主Agent自验模式，运行中修改设置不会改变已有计划；关闭TestAgent后，群聊、项目会话和直接项目任务共用同一自验运行时，实际执行项目已配置的安全验证命令，模型只能引用服务端真实证据ID，不能用`accepted=true`或开发Agent自报文字绕过门禁。模型失败、命令失败、文件证据不足和回执不匹配全部失败关闭；`done + accepted`必须同时具备模式匹配验收回执和主Agent最终验收。完整流程见[TestAgent独立验收与主Agent自验](./confirmed-business-processes/TEST-AGENT-AND-MAIN-AGENT-SELF-VERIFICATION.md)。

- 音乐意图与播放器链路已升级为V2：全局网页、飞书和音乐助手复用统一模型语义决定，服务端候选选择、助手回复和实际播放绑定同一首歌；持久队列采用latest-wins、peek后claim、15秒租约、5秒心跳和用户手势回执，旧下载完成后不能抢回播放权。模型不可用时文本点歌失败关闭，直接点击与播放器控制仍可使用。完整流程见[音乐意图识别与统一播放器V2](./confirmed-business-processes/MUSIC-INTENT-UNIFIED-PLAYBACK-V2.md)。

- 知识库召回与本地Embedding V3已实现：未配置外部接口时，首次运行`ccm start`会在服务就绪后后台下载并校验约118MB多语言INT8模型，不阻塞启动；准备完成后自动重建语义索引。词面和语义候选独立召回，权限过滤先于打分，知识分片按真实Token预算完整注入。索引使用跨进程租约和generation切换，失败向量必须重试，构建失败继续服务last-good；Embedding Key迁入AES-256-GCM凭据仓库。完整流程见[知识库召回与本地Embedding V3](./confirmed-business-processes/KNOWLEDGE-RETRIEVAL-EMBEDDING-V3.md)。

- 自动开发统一任务系统V2已收口：所有新任务绑定精确来源、目标、会话和客户端消息身份；项目主Agent、群聊任务及旧拆分入口进入同一持久任务链。精确会话严格串行，不同会话修改同一源码目录时继续经过共享工作区互斥；高优先级只调整等待顺序，不打断当前任务。自动开发任务不能再通过通用状态接口直接完成，自由文本不能推断终态，最终状态必须通过结构化验收门禁。完整流程见 [自动开发统一任务系统V2](./confirmed-business-processes/AUTOMATIC-DEVELOPMENT-UNIFIED-TASK-SYSTEM-V2.md)。

- 全局、群聊、项目主Agent与项目子Agent的MCP/Skill链路已生产化收口：项目主Agent可在计划、修订和分析中使用项目Skill与只读MCP；子Agent使用签名V2快照分离用户配置和任务角色Skill，六种第三方运行时按原生或代理方式注册；内置`fetch-web-mcp`已改为包内Node实现。完整口径见[Agent MCP与Skill注册继承流程](./confirmed-business-processes/AGENT-MCP-SKILL-INHERITANCE.md)。

- 全局、群聊和项目任务计划书已完成生产化收口：摘要卡保持精简，一级详情从任务回放惰性读取完整模型计划、源码依据、影响范围、全部步骤、验收标准和修订历史；长计划不截断并独立滚动。
- 项目任务使用稳定 `project-main-task:<task_id>` 服务端权威消息，刷新、SSE断线和切换页面后恢复同一任务卡，Web/飞书不会产生重复任务气泡。
- 项目“补充要求”在同一任务内copy-on-success修订计划，重复提交幂等，模型失败保留旧计划；TestAgent关闭后所有页面统一显示“主 Agent自验”，全局任务只展示下游跟踪职责。
- 实现与测试证据见 [自动开发任务完整业务流程](./confirmed-business-processes/AUTOMATIC-DEVELOPMENT-END-TO-END.md) 与 [项目主 Agent编排](./main-agent-workchain/project-main-agent-orchestration-2026-07-24/README.md)。

- 全局 Agent 处理全局会话、拆分跨项目任务，并将业务任务派发到对应群聊；普通网页会话回复不会转发到飞书。
- 群聊主 Agent 绑定单个精确群聊会话，负责任务规划、项目子 Agent 调度、权限审批和最终验收。
- 项目主 Agent绑定单个精确项目会话，负责模型规划、当前项目唯一开发 Agent调度、权限、TestAgent返工复验和最终验收；第三方开发 Agent通过受签名约束的 MCP 快照读取正式会话上下文与项目长期记忆。
- 自动开发统一接收任务派发、工作台、全局 Agent、群聊会话和项目会话的业务需求；模型可从文字、图片和文档生成多个持久分派任务，同一精确会话串行执行并支持真实队列插队，全部验收证据进入任务回放。
- 自动开发任务使用 `TaskIntakeIdentityV2` 绑定来源、目标和精确会话；同次重试幂等、相同需求再次提交生成新任务，禁止跨群聊、项目和会话复用。群聊主 Agent通过最多三轮模型驱动只读源码检索形成带checksum的计划，执行前源码变化会强制重新规划。队列异常必释放运行标记，等待用户的任务进入明确阻塞终态。低风险且源码、权限、TestAgent和交付证据全部通过的Epic可由主 Agent自动验收，其他风险继续等待用户批准。完整流程与验证见 [自动开发任务完整业务流程](./confirmed-business-processes/AUTOMATIC-DEVELOPMENT-END-TO-END.md)。
- 全局、群聊和项目任务使用同一套用户旅程卡：需求确认、资料读取覆盖、队列位置、实时阶段、用户介入、返工轮次和最终交付持续更新在同一任务身份下。项目与群聊展示开发、TestAgent、返工和最终验收；全局只展示执行位置、任务拆分、派发、下游跟踪和交付汇总。未读必需资料会在写操作前 fail closed，Web 与飞书使用相同完成口径。实现见 [全局 Agent 业务任务用户旅程](./main-agent-workchain/global-agent/user-experience/2026-07-27-global-business-task-user-journey-v1.md)。
- 在线文档与本地附件使用同一资料接入链路；全局 Web/飞书、群聊、项目 Web/飞书、任务派发、定时任务、自动开发和知识库均可直接读取公开链接。腾讯文档不再提供开放平台、OAuth、中转或 Cookie 配置；用户只需将文档设置为“获得链接的人可查看”并把地址发给 Agent。遇到登录、申请权限或动态页面时 fail closed。实现见 [在线文档公开链接统一读取](./main-agent-workchain/operations-and-integrations/requirements-and-attachments/online-document-unified-ingestion-2026-07-27/README.md)。
- TestAgent 独立复核交付证据，不直接替代主 Agent 的验收责任；浏览器工单支持显式场景，关键动作保存前后截图，失败证据可由主 Agent通过签名 MCP读取，返工后的命令和浏览器检查都会真实复验。实现见 [TestAgent 浏览器证据与返工复验](./main-agent-workchain/test-agent/browser-evidence-and-rework-verification-2026-07-26/README.md)。
- 设置中心提供全局 TestAgent 开关，默认开启并作用于群聊和项目新任务；关闭后不运行独立 TestAgent，由对应主 Agent只执行一轮自验，页面与任务时间线明确标记该结论不是独立验收，证据不足仍阻止交付。实现见 [TestAgent 开关与主 Agent 自验](./main-agent-workchain/test-agent/test-agent-toggle-and-main-agent-self-verification-2026-07-27/README.md)。
- TestAgent验收按模型语义分为轻量、标准、交互和关键四级；验收标准必须绑定可观察结果与证据，环境阻塞、证据复验和实现返工分别路由，后续轮次只复验失败范围并保留核心回归项。实现见 [TestAgent 风险分级、证据路由与增量复验](./main-agent-workchain/test-agent/risk-tier-evidence-routing-and-incremental-recheck-2026-07-26/README.md)。
- 全局 Mission、群聊主 Agent、项目工作项、TestAgent 三轮返工和最终交付已完成源码级审查；任务体验映射与测试目录也已收口，审计证据见 [业务开发工作链代码审查收口](./main-agent-workchain/business-workflow-code-audit-2026-07-26/README.md)。
- TestAgent 登录资料统一在项目页面的“测试目标”中配置；项目会话和群聊测试目标按所属项目读取同一份加密账号、登录路径和成功条件，不在群聊中重复保存密码。
- 项目管理页面使用“项目上下文栏、源码运行栏、会话列表、项目对话”四层工作区；会话和消息区域独立滚动，空项目只保留一个明确的新建会话入口。
- Spring Boot 多模块项目会区分父聚合构建项和真实可启动服务，并默认选择可启动服务；实现与验收见 [Spring Boot 项目运行支持](./main-agent-workchain/operations-and-integrations/project-management/spring-boot-runtime-support-2026-07-24/README.md)。
- Java 项目启动使用 Maven `spring-boot:run` 或 Gradle `bootRun/run` 直接运行源码，JAR 只由打包操作生成；显式断开项目 Agent 会同时停止当前项目全部源码运行配置和构建任务，但不会影响其他项目。业务口径见 [项目显示名称与源码运行工作台](./main-agent-workchain/operations-and-integrations/project-management/project-runtime-and-display-name-2026-07-23/README.md)。
- 项目运行日志使用 IDEA 风格实时控制台；Spring Boot 启动遇到本地 SNAPSHOT/BOM 或被根 POM 排除的源码模块时，会按真实 Maven 依赖证据受控准备并重试，见 [IDEA 风格运行控制台与 Maven 自动恢复](./main-agent-workchain/operations-and-integrations/project-management/idea-run-console-and-maven-recovery-2026-07-24/README.md)。
- 项目运行控制台顶部支持上下拖动调整日志高度，记住用户上次尺寸，并提供双击复位和键盘调整；实现见 [可调节项目运行控制台](./main-agent-workchain/operations-and-integrations/project-management/resizable-project-run-console-2026-07-27/README.md)。
- 项目会话列表按 Web/飞书来源分组；可为当前项目新建飞书会话并绑定该项目 cc-connect 已发现的飞书目标，目标、会话和回复路由不跨项目，也不复用全局助手或群聊绑定。
- 全局助手与项目管理的 Web/飞书会话分组默认收起；点击分组标题独立展开或折叠会话列表，浏览器会分别记住两个页面的展开状态。
- 项目会话分组、精确绑定和移动端抽屉见 [项目 Web 与飞书会话分组和绑定](./main-agent-workchain/projects/project-feishu-session-separation-2026-07-24/README.md)。
- Windows 上的项目飞书连接、项目子 Agent 和备用外部 Runner 均在无控制台进程树中执行；只有用户主动发起 Agent 登录时才允许打开交互窗口。实现见 [飞书项目 Agent 后台执行](./main-agent-workchain/operations-and-integrations/project-management/feishu-project-agent-hidden-runtime-2026-07-25/README.md)。
- 项目飞书连接运行时使用项目 ACP 进入 CCM 项目主 Agent，不再由 cc-connect 直接调用开发 Agent；活跃 cc-connect 会话存储和 ACP session映射负责 transcript、任务编排和回复回传。全局 ACP会从真实 session映射恢复飞书身份，完整响应体受硬超时约束。修复见 [项目与全局飞书回复链修复](./main-agent-workchain/operations-and-integrations/feishu/project-global-reply-chain-repair-2026-07-25/README.md)。

项目主 Agent与群聊主 Agent使用相同的主 Agent责任链；区别仅在于项目主 Agent只能调度当前项目的一个开发 Agent，群聊主 Agent可以协调多个项目成员。实现与状态边界见 [项目主 Agent 与 TestAgent 编排](./main-agent-workchain/project-main-agent-orchestration-2026-07-24/README.md)。

## 业务开发 Skill

- 群聊主 Agent在业务规划阶段由模型选择业务规则建模和接口数据契约，项目子 Agent加载模型选中的契约与业务场景自验，TestAgent 独立复验关键业务路径。
- 项目会话由模型判定工作流并选择项目主 Agent Skill；开发工作单再把项目执行 Skill 合并进第三方 Agent 的隔离工具快照，普通问答不会由关键词触发开发流程。
- 全局 Agent只负责项目/群聊路由和监督，不重复加载项目级业务 Skill。

确认流程和触发边界见 [业务开发核心 Skill](./main-agent-workchain/shared-workchain/business-development-core-skills-2026-07-23/README.md)。

## 模型语义路由

- 全链路语义路由已完成生产化收口：`SemanticDecisionRuntimeV1`统一承载工作流、跨Agent协作、TestAgent计划、记忆提取和验收展示，绑定精确scope/session/task并执行singleflight、真实Token门禁、失败关闭和脱敏成功/失败回执。项目子Agent的`target=auto`只能由群聊主Agent模型选人；TestAgent只执行模型生成且逐条覆盖验收标准的结构化计划；全局与音乐长期记忆只接收带消息ID和逐字证据的模型候选。
- 子Agent验证回执新增结构化`verificationResults`，任务状态、自动验收和任务回放不再从“passed、失败、建议运行”等自由文本猜测结论。群聊/项目压缩只保护模型确认或系统结构化事实；旧关键词时代记忆显示为`legacy_unverified`。完整流程见[全链路模型语义路由完整业务流程](./confirmed-business-processes/MODEL-SEMANTIC-ROUTING-END-TO-END.md)。
- 所有生产入口中需要理解用户自然语言含义的选择统一由模型完成，包括任务/问答、状态查询、Skill、项目成员、代码修改、Epic、Agent QA、TestAgent 验收动作和音乐策略。
- 本地代码只处理语法、实体 ID、路径、schema、权限、容量、Provider 错误和结构化证据校验。
- 模型不可用或结果无效时 fail closed，不回退到关键词、正则、随机选曲或 coded coordinator。

完整边界和审计证据见 [全链路模型语义路由](./main-agent-workchain/shared-workchain/model-semantic-routing-alignment-2026-07-23/README.md)。
最新独立复查修复了显式任务字段缺失、多轮决策覆盖、需求预览本地兜底、记忆忽略正则、返工文本路由和歌手字段误筛，见 [模型语义路由独立自检](./main-agent-workchain/shared-workchain/model-semantic-routing-self-audit-2026-07-24/README.md)。

## 模型可靠性

- 网页与飞书的全局、群聊、项目、音乐、TestAgent规划和会话压缩共用模型重试策略。
- 网络、超时、Provider临时不可用、空响应和无效 JSON 最多尝试 5 次；单次请求尊重用户或 Provider 配置的超时，未配置时为 30 秒，长推理总预算最多 360 秒。
- 认证、配置、请求格式和上下文安全上限等确定性错误立即失败，不执行无意义重试。
- 群聊任务的主 Agent 返回 `llm-error` 后禁止进入派发修复；Provider 调用耗尽会打开当前任务独立的 5/15/30/60 分钟冷却，队列、启动恢复、自动返工和手动重试统一受熔断门禁约束。

实现和 mock 验证见 [统一模型五次尝试与快速失败](./main-agent-workchain/operations-and-integrations/model-reliability/unified-five-attempt-model-retry-2026-07-25/README.md) 与 [Provider 超时与任务级熔断](./main-agent-workchain/operations-and-integrations/model-reliability/provider-timeout-and-task-circuit-breaker-2026-07-27/README.md)。

## 记忆与上下文

- 从用户消息写入、精确会话投影、隐藏执行链、Token门禁、MicroCompact、正式模型压缩、长期记忆准入、第三方Agent MCP hydration、缓存到删除清理的完整确认流程，见 [记忆系统完整业务流程](./confirmed-business-processes/MEMORY-SYSTEM-END-TO-END.md)。

- `CCM Context Engine V2` 已统一全局、群聊、项目和音乐 Agent 的不可变上下文块、Token门禁、Provider能力证据、原生缓存/受控投影、真实usage和第三方 MCP增量确认。自定义中转站必须由两轮稳定前缀请求返回真实缓存 Token才标记为已确认；vLLM/SGLang仅作为外接服务连接，不随 npm安装 GPU运行时。实现与证据见 [CCM Context Engine V2](./group-memory-cc-parity/ccm-context-engine-v2-2026-07-28/README.md)。
- Provider原生缓存不可用或无法证明时，Context Engine继续使用CCM自建缓存：短期内存物化、并发Singleflight、自适应稳定前缀、真实usage成本/延迟建议、会话生命周期清理和跨进程文件租约。它不缓存最终回答、不把本地复用伪装成原生KV命中，Prompt正文不落盘。
- 全局、群聊和项目会话分别维护独立 transcript、正式模型摘要、近期原文窗口和压缩边界。
- 全局、群聊和项目现已共用同一个精确会话模型上下文投影器；未压缩时传递本轮请求之前的全部完整轮次，不再使用项目主 Agent 的 `5K/12K/24K` 字符截断。容量达到真实 Token 门限时先执行正式模型压缩并重建投影；MicroCompact只选择已配对、足够旧且满足时间或门限压力条件的工具结果，最近结果与原始账本保持完整。实现与证据见 [未压缩上下文统一投影](./group-memory-cc-parity/unified-uncompressed-context-projection-2026-07-28/README.md)。
- 全局与项目主 Agent 已增加按精确会话保存的隐藏工具执行链；源码读取、运行诊断、授权 MCP、任务派发和验收结果不显示为聊天气泡，但会参与压缩、恢复和真实 Token 计量。实现见 [全局与项目主 Agent 隐藏执行链 CC 对齐](./group-memory-cc-parity/global-project-hidden-execution-ledger-2026-07-27/README.md)。
- 未压缩会话使用完整历史；压缩后使用正式摘要加动态近期完整原文；后续压缩沿用上一代摘要形成连续链。
- 项目子 Agent 读取绑定会话、相关长期记忆、当前工作单及显式配置的 MCP、Skill 和共享文件，不允许跨 scope 读取。
- 群聊项目子 Agent 的 `ccm__group_coordinator` 使用统一签名内部 MCP 上下文；每次调用重新核验精确群聊会话、正式任务、项目成员、任务 Agent 会话和原生会话，跨会话、已结束任务及篡改令牌均 fail closed。协调请求、主 Agent claim、独立工作项、验收合并和原会话恢复保持同一作用域并进入脱敏调用审计。
- MCP 与 Skill 按群聊、项目和全局 Agent独立授权；项目和全局会话页头直接展示当前授权数量。全局 Agent只把全局允许列表写入模型上下文并通过服务端门禁真实调用，不继承群聊或项目授权。完整边界见 [MCP 与 Skill 作用域授权](./confirmed-project-architecture/TOOL-AUTHORIZATION.md)。
- 本地规则摘要只能用于校验，不能成为 canonical summary；压缩失败时不推进边界。
- 会话上下文面板按真实模型可见快照展示 System、工具、Rules、Skills、MCP、子 Agent、摘要、近期原文、恢复附件和 Hooks；全局飞书与 Web共用计量写回，旧记录缺少分项时明确标记为历史未归类总量。实现见 [会话上下文 MCP 与 Skill 分项计量](./main-agent-workchain/operations-and-integrations/frontend-experience/session-context-mcp-skill-accounting-2026-07-25/README.md)。
- 记忆中心的全局、群聊和项目精确会话共用 MicroCompact 状态面板，展示经过 checksum核验的触发原因、旧结果清理量、近期保留量、节省 Token、执行时间与原始 transcript保留状态；旧会话没有历史回执时明确显示“历史数据未记录”，不伪造统计。实现与证据见 [未压缩上下文统一投影](./group-memory-cc-parity/unified-uncompressed-context-projection-2026-07-28/README.md)。
- 压缩模型的 Prompt Too Long 恢复已按 CC 的 assistant response/API 回合执行，不拆分工具调用与结果；压缩候选必须通过真实业务 payload 的第二次 Token 门禁。Anthropic 可使用原生缓存编辑，其他 Provider只记录 CCM 受控投影回执，不伪造原生缓存能力。

## 权限与通道

- 读取类操作默认放行；写入、执行、网络、发布等风险操作进入分层权限审批。
- 项目会话由用户审批，群聊项目子 Agent 优先由群聊主 Agent 判断，无法判断时再请求用户。
- 每个飞书聊天使用独立 `feishu:*` 全局会话，不继承 Web transcript；普通回答回复原消息，任务阶段更新同一张卡，网页来源会话与飞书回复互不串线。
- 全局助手会话栏按 Web/飞书来源分组；可在 Web 页面新建飞书会话、查看当前飞书目标绑定并执行绑定或解绑，Web 历史同步和“清空网页会话”都不会改动飞书会话。
- 飞书用户分为查看者、操作员和管理员；全局、群聊及项目来源的权限申请可通过签名交互卡审批，五次投递失败后通知 Web 与桌面宠物并支持设置页精确重试。
- 项目飞书通过私有 ACP运行副本进入项目主 Agent；该副本使用稳定的 `compact` 进度模式，ACP文本确认写入后才结束回合，用户保存的开发 Agent与飞书配置不被替换。真实平台验收必须同时看到适配器交付记录和项目会话中的非空正式回复。
- 后端重新构建不会热替换正在运行的 CCM Node.js进程；涉及项目通道生成逻辑时必须重启 CCM主服务并读取实际私有运行配置核验。项目通道日志采用追加模式，重连不得覆盖历史诊断证据。
- 项目飞书会话通过 `project.session_messages_changed` 实时同步当前 Web 会话：入站用户消息与正式回复分别触发精确会话刷新，SSE断线时仅当前飞书会话保留 60 秒低频兜底，不轮询网页会话。
- 项目会话上下文面板在无 Provider usage时从权威 transcript估算 Token；未压缩使用完整原文，压缩后使用正式摘要加近期原文，并展示 Conversation与摘要分项，不再把已有消息显示为 0。

完整链路见 [飞书精确会话、交互审批与投递恢复](./main-agent-workchain/integrations/feishu-conversation-security-and-recovery-2026-07-24/README.md)。
会话分组与绑定管理见 [全局助手飞书会话分组与绑定](./main-agent-workchain/integrations/global-feishu-session-binding-2026-07-24/README.md)。
折叠交互与状态边界见 [Web 与飞书会话折叠分组](./main-agent-workchain/operations-and-integrations/frontend-experience/collapsible-web-feishu-session-groups-2026-07-25/README.md)。

## 运行时更新

- `/api/runtime/events` 是任务、权限、Agent、飞书、项目、群聊和定时任务状态的统一 SSE 通道。
- 前端使用单例连接按事件定向刷新，断线时保留 60 秒低频兜底；旧工作台流接口继续兼容但不再固定 5 秒重算。
- SSE 事件只携带安全状态字段，不包含消息正文、附件、transcript 或密钥。
- Agent 性能监控支持今天、近 7/14/30/90 天和全部历史；执行记录通过服务端分页读取全部保留数据，并可按成功、失败和取消筛选。实现见 [性能范围与执行记录分页](./main-agent-workchain/operations-and-integrations/frontend-experience/agent-performance-range-and-execution-pagination-2026-07-27/README.md)。

## 界面主题

- 页面背景、内容表面、输入控件、原生下拉选项、弹窗和状态区域统一使用当前主题变量。
- 深色与特色预设从各自配色派生抬升表面和成功、警告、危险背景，不再混入固定白底或其他主题色相。
- 登录页独立浅色皮肤、二维码识别画布和开关圆点保留固定白色；其他业务页面由自动扫描阻止新增固定白色表面。

## 页面加载

- 登录校验、工作台和所有异步业务页复用统一页面加载遮罩；业务遮罩只覆盖内容区，导航和当前页面名称保持可见。
- 首次打开标签页时等待页面模块和首轮关键 GET 数据，完成后才展示真实空状态；再次切回已加载标签不重复遮挡。
- SSE、状态流、音乐远程命令及后续后台刷新不参与门禁；超过 8 秒显示慢加载提示和重新加载入口。

实现边界和验证证据见 [全页面统一加载遮罩](./main-agent-workchain/operations-and-integrations/frontend-experience/global-page-loading-overlay-2026-07-23/README.md)。

## 我的工作台

- 工作台占满当前标签内容区，不再受固定 `1320px` 最大宽度限制。
- 状态统计、目标输入、快捷入口和工作网格共享同一内容宽度；桌面资源栏按约 25% 响应式扩展。
- 窄屏自动切换单列，手机端保持全宽且不产生横向滚动。

当前布局见 [工作台全宽数据布局](./main-agent-workchain/operations-and-integrations/frontend-experience/workbench-full-width-data-layout-2026-07-23/README.md)。

## 设置中心

- 设置标题、导航和表单占满当前标签内容区，不再受固定 `1120px` 最大宽度限制。
- 桌面端保持 `220px` 设置导航，右侧面板使用全部剩余空间；移动端继续使用横向导航和单列表单。

当前布局见 [设置中心全宽布局](./main-agent-workchain/operations-and-integrations/frontend-experience/settings-full-width-layout-2026-07-23/README.md)。

## 项目管理

- 顶部项目选择器按用户文件夹分组项目，支持搜索、折叠、创建、重命名、删除和整理归类。
- 文件夹只保存项目内部 ID的视图映射；删除文件夹时项目回到“未分组”，不会影响源码、会话、记忆、任务、飞书或运行配置。
- 文件夹数据保存在本地 `project-folders.json` 并通过 Runtime SSE同步，浏览器单独保存折叠状态。

实现边界见 [项目文件夹与工作空间选择器](./main-agent-workchain/operations-and-integrations/project-management/project-folder-workspace-selector-2026-07-25/README.md)。

## 代码协作

- 桌面端文件树与 Diff 是等高独立面板，外层页面固定；滚动任意一侧不会改变另一侧的位置。
- 文件筛选和 Diff 工具栏固定在各自面板顶部，长文件目录和长代码只在对应面板内滚动。
- 移动端使用上下等高面板，并保留工作台纵向导航能力。

当前滚动边界见 [代码协作等高双面板独立滚动](./main-agent-workchain/operations-and-integrations/code-changes/independent-dual-pane-scroll-2026-07-23/README.md)。

## 发布与跨平台

- 发布矩阵覆盖 Windows、Ubuntu 与 Node.js 20/22，并执行构建、CLI 生命周期、npm 安装包和终端能力回归。
- `node-pty` 作为可选原生能力：预编译模块可用时提供持久交互 Shell；不可用时应用和其他功能继续运行，终端切换为命令兼容模式。
- 五种开发 Agent 的发布验收分为无调用预检和显式 live 验收；live 结果只保存状态、版本、模型、输出 checksum 和工作目录 checksum，不保存模型原始回复。

实现和验收边界见 [跨平台安装与真实链路发布验收](./main-agent-workchain/releases/cross-platform-live-acceptance-2026-07-23/README.md)。

本地会话、数据库、凭据、运行日志和测试产物不会进入 Git；规则和保留边界见 [Git 本地数据与敏感产物隔离](./main-agent-workchain/security/git-local-data-hygiene-2026-07-23/README.md)。

## 验证入口

- 日常快速回归：`npm test`
- 指定领域：`npm run test:domain -- <domain>`
- 完整领域回归：`npm run test:all`
- 类型和生产构建：`npm run check`、`npm run build`
- 文档目录与链接：`npm run docs:check`
- 发布环境预检：`npm run release:preflight`

完整命令和领域清单见 [测试指南](./TESTING.md)。

## CC 记忆链五项收口

- 群聊压缩后的 Skill、计划、文件去重、动态工具目录和子任务状态均以精确会话回执恢复，重启或快照重建不再被空结果覆盖。
- 非 Anthropic 原生链的 MicroCompact只接受空闲时间触发；上下文压力统一进入正式压缩。
- 长期记忆统一映射 `user | feedback | project | reference`，并排除临时过程、失败文本、Skill/MCP定义和源码可推导事实。
- 全局与项目支持旧超大工具结果的可恢复投影替换，原始隐藏执行账本保持完整。
- 全局、群聊和项目的 post-compact门禁在 fail closed前只允许一次正式模型重压缩。

实现与审计见 [CC 记忆链五项收口](./group-memory-cc-parity/cc-memory-five-improvements-2026-07-28/README.md)。

## 业务需求池

- 用户可以在需求池上传业务描述、图片或文档，主模型先生成可编辑的任务图，确认后才原子创建需求集合父任务和全部子任务。
- 拆分结果支持修改执行位置、范围、验收标准与依赖，也支持新增、删除、合并和排序；浏览器与服务端都会拒绝未知依赖、自依赖和循环依赖。
- 无前置依赖的任务进入精确会话的串行队列，后继任务必须等待前置任务通过交付验收；代码或文件变化继续经过 TestAgent 独立验收。
- 需求池只展示集合整体进度，完整计划、开发、验收、返工和证据统一进入原有任务回放，避免形成第二套事实源。

完整流程见 [文档驱动需求集合与自动执行](./main-agent-workchain/operations-and-integrations/requirements-and-attachments/document-driven-requirement-collections-2026-07-27/README.md)。

## 群聊源码驱动规划

- 群聊代码任务在派发前必须读取模型识别出的相关项目源码，并保存项目、相对路径、文件 checksum 与快照 checksum。
- 群聊主 Agent负责生成目标、边界、数据关系、依赖步骤和验收计划；开发 Agent只负责当前源码复查、实现、验证和回执。
- 代码工作项统一串行执行。缺少源码证据、计划新增未读取项目或 TestAgent未通过时均不能交付。
- 实时计划书展示实施目标和执行步骤，边界与数据关系按需展开，源码正文不直接堆入用户界面。

实现与证据见 [群聊主 Agent 源码驱动规划](./main-agent-workchain/group-main-agent/source-grounded-planning-2026-07-27/README.md)。
# 2026-07-28 Provider 中立上下文缓存

- 全局、群聊和项目主 Agent 已接入统一的不可变上下文块与编辑计划。
- Anthropic 原生 `context_management` 与 CCM 受控投影严格区分；普通 API 不伪装原生 KV cache。
- 记忆中心增加模式、块复用、变化量、投影 Token 和真实 Provider usage 展示。
- 原始 transcript、正式摘要和执行账本仍是唯一事实来源，缓存层不写长期记忆。
- 审计文档：[provider-neutral-context-cache-2026-07-28](group-memory-cc-parity/provider-neutral-context-cache-2026-07-28/README.md)。
- Provider Adapter V2 已覆盖 OpenAI 原生 Prompt Cache、Gemini Generate Content 隐式缓存、Anthropic 上下文编辑与可选块级 cache reference；自定义网关默认 fail safe，必须显式声明能力后才能收到原生缓存字段。

# 2026-07-28 Context Engine V2.1 运行保障

- 最终上下文门禁升级为模型级Token预检，并使用真实Provider usage持续校准。
- 全局、群聊、项目和音乐摘要提交前统一检查边界、持久锚点、连续性、来源支撑和虚假完成状态。
- 记忆中心展示压缩率、缓存命中、Token增长、摘要质量和连续失败趋势。
- 正式压缩前自动创建精确会话恢复点，支持无写入演练和管理员确认恢复。
- 第二模型摘要抽检默认关闭；开启后按精确摘要稳定抽样、单次调用、失败关闭。
- 实施审计：[ccm-context-engine-v21-quality-observability-recovery-2026-07-28](group-memory-cc-parity/ccm-context-engine-v21-quality-observability-recovery-2026-07-28/README.md)。
