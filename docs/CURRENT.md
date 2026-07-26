# CCM 当前状态

本文只记录当前可依赖的产品结构。详细协议和业务边界以 [确认项目结构](./confirmed-project-architecture/README.md) 为准，历史实现过程从 [归档索引](./archive/README.md) 查找。

## 核心工作链

- 全局 Agent 处理全局会话、拆分跨项目任务，并将业务任务派发到对应群聊；普通网页会话回复不会转发到飞书。
- 群聊主 Agent 绑定单个精确群聊会话，负责任务规划、项目子 Agent 调度、权限审批和最终验收。
- 项目主 Agent绑定单个精确项目会话，负责模型规划、当前项目唯一开发 Agent调度、权限、TestAgent返工复验和最终验收；第三方开发 Agent通过受签名约束的 MCP 快照读取正式会话上下文与项目长期记忆。
- 自动开发统一接收任务派发、工作台、全局 Agent、群聊会话和项目会话的业务需求；模型可从文字、图片和文档生成多个持久分派任务，同一精确会话串行执行并支持真实队列插队，全部验收证据进入任务回放。
- TestAgent 独立复核交付证据，不直接替代主 Agent 的验收责任。
- TestAgent 登录资料统一在项目页面的“测试目标”中配置；项目会话和群聊测试目标按所属项目读取同一份加密账号、登录路径和成功条件，不在群聊中重复保存密码。
- 项目管理页面使用“项目上下文栏、源码运行栏、会话列表、项目对话”四层工作区；会话和消息区域独立滚动，空项目只保留一个明确的新建会话入口。
- Spring Boot 多模块项目会区分父聚合构建项和真实可启动服务，并默认选择可启动服务；实现与验收见 [Spring Boot 项目运行支持](./main-agent-workchain/operations-and-integrations/project-management/spring-boot-runtime-support-2026-07-24/README.md)。
- 项目运行日志使用 IDEA 风格实时控制台；Spring Boot 启动遇到本地 SNAPSHOT/BOM 或被根 POM 排除的源码模块时，会按真实 Maven 依赖证据受控准备并重试，见 [IDEA 风格运行控制台与 Maven 自动恢复](./main-agent-workchain/operations-and-integrations/project-management/idea-run-console-and-maven-recovery-2026-07-24/README.md)。
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

- 所有生产入口中需要理解用户自然语言含义的选择统一由模型完成，包括任务/问答、状态查询、Skill、项目成员、代码修改、Epic、Agent QA、TestAgent 验收动作和音乐策略。
- 本地代码只处理语法、实体 ID、路径、schema、权限、容量、Provider 错误和结构化证据校验。
- 模型不可用或结果无效时 fail closed，不回退到关键词、正则、随机选曲或 coded coordinator。

完整边界和审计证据见 [全链路模型语义路由](./main-agent-workchain/shared-workchain/model-semantic-routing-alignment-2026-07-23/README.md)。
最新独立复查修复了显式任务字段缺失、多轮决策覆盖、需求预览本地兜底、记忆忽略正则、返工文本路由和歌手字段误筛，见 [模型语义路由独立自检](./main-agent-workchain/shared-workchain/model-semantic-routing-self-audit-2026-07-24/README.md)。

## 模型可靠性

- 网页与飞书的全局、群聊、项目、音乐、TestAgent规划和会话压缩共用模型重试策略。
- 网络、超时、Provider临时不可用、空响应和无效 JSON 最多尝试 5 次；单次最长 30 秒，总预算最长 180 秒。
- 认证、配置、请求格式和上下文安全上限等确定性错误立即失败，不执行无意义重试。
- 全局飞书 ACP在 190 秒结束失败请求，cc-connect回合最迟在 5 分钟内硬停止，不再保留一两个小时的挂起回合。

实现和 mock 验证见 [统一模型五次尝试与快速失败](./main-agent-workchain/operations-and-integrations/model-reliability/unified-five-attempt-model-retry-2026-07-25/README.md)。

## 记忆与上下文

- 全局、群聊和项目会话分别维护独立 transcript、正式模型摘要、近期原文窗口和压缩边界。
- 未压缩会话使用完整历史；压缩后使用正式摘要加动态近期完整原文；后续压缩沿用上一代摘要形成连续链。
- 项目子 Agent 读取绑定会话、相关长期记忆、当前工作单及显式配置的 MCP、Skill 和共享文件，不允许跨 scope 读取。
- MCP 与 Skill 按群聊、项目和全局 Agent独立授权；项目和全局会话页头直接展示当前授权数量。全局 Agent只把全局允许列表写入模型上下文并通过服务端门禁真实调用，不继承群聊或项目授权。完整边界见 [MCP 与 Skill 作用域授权](./confirmed-project-architecture/TOOL-AUTHORIZATION.md)。
- 本地规则摘要只能用于校验，不能成为 canonical summary；压缩失败时不推进边界。
- 会话上下文面板按真实模型可见快照展示 System、工具、Rules、Skills、MCP、子 Agent、摘要、近期原文、恢复附件和 Hooks；全局飞书与 Web共用计量写回，旧记录缺少分项时明确标记为历史未归类总量。实现见 [会话上下文 MCP 与 Skill 分项计量](./main-agent-workchain/operations-and-integrations/frontend-experience/session-context-mcp-skill-accounting-2026-07-25/README.md)。

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
