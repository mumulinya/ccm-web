# CCM Workspace

<p align="center">
  <a href="#中文">中文</a> · <a href="#english">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mumulinya/ccm-web/main/ccm-package/public/ccm-app-icon.png" alt="CCM Workspace" width="88" height="88" />
</p>

<p align="center">
  <strong>本地优先的多 Agent 协作、自动开发与工作区管理平台</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mumulinya167/cc-web"><img src="https://img.shields.io/npm/v/@mumulinya167/cc-web" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/storage-local--first-0f766e" alt="Local first" />
</p>

<a id="中文"></a>

## 中文

CCM 将全局助手、群聊主 Agent、项目主 Agent、项目开发 Agent、TestAgent、会话记忆、MCP/Skill、知识库、Git、终端、飞书和任务回放放进同一个本地工作区。它不是单一聊天界面，而是一套从需求进入、源码规划、开发执行、独立验收到最终交付的可恢复工作流。

## 快速开始

要求 Node.js 20 或更高版本。

```bash
npm install -g @mumulinya167/cc-web@latest
ccm start --background --open
```

默认访问地址：<http://localhost:3080>

- 默认只监听 `127.0.0.1`，不会自动暴露到局域网或公网。
- 首次运行会创建本地数据目录并进入账户初始化流程。
- 账户、项目、会话、任务和运行数据保存在 `~/.cc-connect`，不会写入 npm 安装目录。
- 首次运行会在后台准备本地知识库 Embedding 模型；下载失败不会阻止CCM启动，知识检索会明确降级。
- Electron不随服务端安装。桌面宠物首次启动时按需准备桌面运行时，纯Web或Linux服务器无需下载。

检查安装状态：

```bash
ccm status
ccm doctor
ccm logs --follow
```

## 核心工作链

```text
用户消息 / 需求文档 / 图片 / 附件
→ 精确会话队列
→ 动态构建会话、记忆、Skill、MCP和来源上下文
→ 主 Agent自适应循环、精确代码检索与用户可读计划
→ 项目开发 Agent通过ACK、进度、Result协议执行工作项
→ Evidence新鲜度校验与TestAgent独立验收
→ 增量返工、复验和主 Agent最终总结
→ Terminal Gate生成终态与文件交付
→ 原会话回传、跨会话导航、任务回放与记忆准入
```

普通问答由主 Agent首轮直接回答。只有模型确实需要信息时才加载知识、源码、Skill或MCP；复杂开发任务进入持久队列和验收链，后台执行不会长期占用聊天回合。

## 2.0.9 最新能力

- **全局与群聊长期记忆管理升级**：全局 Agent 记忆中心深度升级，引入全局主题索引（Topic Index）、记忆账本（Ledger）、事务隔离与蒸馏记忆（Distilled Memory）；支持长短期记忆投影、动态窗口、分层 Token 预算管理及权威源文件证明；引入会话边界日志（Memory Boundary Journal）与反应式压缩恢复，保障跨会话长程记忆与断点续跑零丢失。
- **Agent 执行流可视化与交互体验增强**：
  - **行内 Agent Diff（Inline Agent Diff）**：主 Agent 及子 Agent 产生的文件变更在执行流步骤中直接原位呈现代码差异高亮，直观掌握文件修改。
  - **子 Agent 嵌套会话（Nested Child Agent Conversation）**：子 Agent 的执行步骤与内部对话以嵌套层级折叠呈现，清晰追溯多 Agent 协作细节。
  - **需求方案确认与一键执行（Presented Requirement Plan）**：提供直观的方案确认卡片与一键执行流，支持实施前业务澄清问答与交互式决策。
  - **会话待办事项追踪（Conversation Todo）**：在会话中实时同步并追踪待办事项完成度与步骤进度。
  - **文件阅读与检索折叠收起（Read & Search Collapsible Header）**：大批量文件读取与代码搜索步骤自动收拢折叠，显著降低聊天视窗干扰。
  - **工具结果多维结构化呈现（Rich Tool Result Detail & Replay）**：工具输出深度适配各类结构化数据，提供更详尽可读的视图与回放支持。
- **上下文引擎与多 Provider 缓存优化**：提供中立 Provider 提示词缓存与微压缩生命周期管理，降低长会话 Token 消耗；原生会话与执行日志深度对齐。
- 全局、项目和群聊统一采用真实流式回答与可解释进度：工具完成后立即展示安全结果和下一步，长等待只显示真实阶段，不展示隐藏推理。
- 开发需求、只读分析和普通问答使用统一边界；只有明确需要修改代码或配置时才创建正式开发任务，修改仍由受控项目开发 Agent执行。
- 执行记录升级为“摘要 → 用户可读详情 → 技术详情”三层展示，目录、文件、搜索位置、读取范围、Git与验证结果不再暴露原始JSON字段。
- 支持安全暂停与原位续接、任务意图路由、计划前业务澄清、飞书附件接入、运行时状态中心和离开期间摘要。
- 完成态严格由当前generation的Terminal Gate确认；失败、暂停、中断和等待处理不会伪装为正式交付。
- 主 Agent文件读取升级为安全续读闭环：批量读取会稳定保留原文件集合，一键继续读取未完成内容，并通过checksum阻止文件漂移后误拼接旧结果。
- 同一模型上下文内的重复读取会返回未变化状态，避免重复注入正文与重复计算Token；新任务、压缩、恢复或generation变化后会重新读取权威内容。
- Glob和Grep优先使用npm随包安装的ripgrep，系统ripgrep和Node安全实现作为降级；搜索支持超时、取消和已完成部分结果保留。
- 文件路径不存在时返回受项目权限、敏感文件和真实路径边界约束的候选建议，不会猜测或暴露越界文件。
- 全局、项目和群聊使用同一套只读工作区工具与展示；主 Agent负责读取、分析和规划，代码修改仍由受控项目开发 Agent执行。
- 修复全局 Agent 上下文边界白名单遗漏，恢复全局飞书会话和“继续”操作的正常执行。
- 全局、项目和群聊统一接入可恢复任务队列、阶段计划、执行记录与任务回放；服务重启后保留任务现场和会话连续性。
- Agent 指标覆盖主 Agent、项目子 Agent 和 TestAgent，支持真实 Token、费用、阶段耗时与进程资源观测；未提供 usage 时明确显示原因。
- 运行中的文件查询按“读取文件、查找文件、搜索代码、检查 Git、运行验证”分层展示，普通消息不暴露原始 Shell 命令。

### 代码智能工作台

- 新增三栏代码智能工作台：项目、文件和符号树位于左侧，语义结果与调用关系位于中间，权威源码定位和Agent操作位于右侧。
- 支持工作区/文件符号、定义、引用、实现、类型定义、调用者、被调用者和代码诊断九类语义查询。
- 查询优先使用精确的`path + line + character`，同名符号不会再默认跳到第一个文本匹配。
- TS/JS使用随包TypeScript服务；Vue、Python、Go、Rust、Java、Kotlin、C/C++、C#、PHP、Ruby、Lua、HTML、CSS和JSON通过标准LSP接入。
- 索引按需启动并增量维护，提供异步进度、运行历史、语言覆盖率、服务缺失、失败文件、RepoState新鲜度和修复入口。
- 源码仅在用户打开位置时从当前项目有界重读，索引、Evidence、查询历史和导出均不保存源码正文。
- 查询结果可生成带位置、checksum和Evidence引用的项目/群聊会话草稿，默认等待用户确认，不直接创建开发任务。

### CC风格执行流与第三方Agent通信

- 普通问答保持“正在思考→最终回答”；发生工具、Skill、MCP或子Agent调用时，才显示可折叠执行过程。
- 任务运行中按准备与检索、用户可读计划、项目Agent、独立验收、返工复验、主Agent总结分阶段展示；完成后收起为执行记录。
- 工具和Agent按稳定身份原位更新，不同时保留“执行中”和“已完成”两行；详情展示安全参数、业务结果、耗时和Token口径。
- Claude Code、Codex、Cursor、Gemini/Antigravity、OpenCode和Qoder通过Agent Communication V2绑定任务、工作项、精确会话、generation、attempt与lease。
- 新任务执行前要求真实ACK；运行时可上报结构化进度、工具、文件与验证事件，缺少业务进度时只展示系统观察到的事实，不解析隐藏思维或猜测stdout。
- Result只表示第三方Agent声明完成；CCM仍会核对实际文件变化、RepoState、Evidence、TestAgent和Terminal Gate后再生成成功终态。

### 动态上下文、来源连续性与跨会话任务

- MCP支持`deferred`、`auto`和`inline`加载；Skill目录、MCP Schema、压缩恢复与输出预留按真实模型上下文动态分配。
- Skill支持父循环内联与`context: fork`隔离执行；压缩后重新校验Skill hash、权限和已发现Schema。
- 知识库与共享文件正文只进入当前Loop；长期保存无正文来源回执，压缩后从权威存储校验版本并重新读取。
- 全局Agent、工作台和需求池投放任务时只选择目标群聊或项目；系统解析或创建来源绑定的自动化任务会话。
- 来源任务卡和目标会话双向导航，同一任务原位更新计划、项目Agent、TestAgent、返工、验证、文件变化与最终交付。
- Evidence Registry将命令、Diff、测试、评审、制品和来源绑定到RepoStateIdentity；代码状态变化后旧证据自动变为陈旧，不能满足新的验收条件。

## 功能概览

### 三类主 Agent与统一工具核心

- **全局 Agent**负责普通问答、全局状态、目标选择以及跨群聊、跨项目派发。
- **群聊主 Agent**绑定精确群聊会话，读取成员项目能力并协调跨项目工作。
- **项目主 Agent**绑定单个项目，按需读取源码、Git、运行日志、知识和项目工具。
- 三类主 Agent共享一套受控工具目录，但会话、记忆、队列和权限范围彼此隔离。
- 主 Agent默认只有结构化只读源码工具；代码写入和Shell执行由项目开发 Agent承担。

### 自动开发、计划与验收

- 需求池、全局 Agent、工作台、群聊和项目会话共享同一任务事实与状态机。
- 主 Agent先读取相关源码，再生成目标、边界、依赖、源码证据、工作项和验收标准。
- 计划在任务卡中实时更新，补充要求可修订同一任务，不创建重复气泡。
- 项目开发 Agent按精确工作项执行，TestAgent独立验证命令、HTTP和浏览器行为。
- TestAgent关闭时明确切换为主 Agent自验，不显示或暗示独立验收。
- 失败会生成精确返工项；最终交付进入原会话、长期记忆和任务回放。

### 中断、重试与恢复

- 普通问答、编排和长任务使用不同的重试与总时限配置。
- 网络、Provider或服务重启导致中断时保留任务、计划、源码证据和子 Agent原生会话。
- 能证明不会重复副作用时自动恢复；Git提交、发布或部署结果不确定时等待用户确认。
- “停止当前执行”和“永久取消任务”是两个独立动作，停止不会删除会话。
- 旧执行attempt的租约和fencing token失效后，迟到结果不能覆盖恢复后的新执行轮。

### CC式上下文与记忆

- 全局、群聊和项目使用精确会话隔离的完整对话链。
- 未超限时保留全部完整轮次；超过真实Token容量时先执行正式模型压缩。
- 不用字符截断伪装完整读取，不因压缩删除原始transcript或隐藏工具账本。
- Skill正文和延迟MCP Schema按需加载；压缩后仅恢复实际调用的Skill和已加载工具状态。
- MicroCompact只处理足够旧、已配对且满足上下文压力条件的工具结果。
- 记忆中心展示系统提示、规则、Skill、MCP、会话、Token、压缩边界、缓存和恢复来源。
- Provider无法证明原生缓存时使用CCM受控上下文投影，不伪装成Provider KV缓存。

### MCP、Skill与工具市场

- 主 Agent原生支持询问用户、Todo、计划、Skill调用、工具搜索、任务派发和状态读取。
- 内置只读工作区工具覆盖目录、Glob、Grep、分段文件读取、定义/引用、Git状态/Diff/历史和运行日志。
- 用户可按全局、群聊和项目作用域配置MCP与Skill。
- 项目开发 Agent获得绑定任务、项目、会话、generation和目录revision的签名授权快照。
- 工具市场对社区和自定义工具执行安全读取、隔离预览、Admin确认、运行时测试与授权重同步。
- 工具调用写入精确会话隐藏执行账本，不暴露Prompt、密钥或原始协议。

### 开发 Agent运行时

CCM负责配置、派发、上下文交付、授权和回执验收，第三方CLI由用户自行安装并登录。

| 运行时 | 主要用途 |
| --- | --- |
| Claude Code | 项目开发与原生会话续跑 |
| Codex CLI | 项目开发、模型选择与会话续跑 |
| Cursor Agent | 项目开发与本机登录态执行 |
| Antigravity CLI | Google账号体系的开发Agent适配 |
| OpenCode | 多Provider开发运行时 |
| Qoder CLI | 可选项目开发运行时 |

设置页可检查安装、版本、登录状态、可用模型和真实只读测试。CCM不会替用户创建第三方账号、模型额度或外部授权。

### 项目、Git、终端与源码运行

- 项目管理支持本地目录、项目分组、GitHub仓库、JDK/Maven/Gradle和多套运行配置。
- Git工作区支持分页状态、Diff、精确文件提交、fetch、fast-forward pull、push和可核验操作回执。
- 同一仓库写入事务串行；状态漂移、路径越界、符号链接和隐式全量提交会被拒绝。
- 内置终端使用`node-pty`与xterm；原生模块不可用时降级到逐条命令模式，核心服务仍能启动。
- Java项目使用Maven/Gradle源码运行配置，不强制先构建JAR。
- 项目Agent连接状态与源码运行状态分离，断开项目Agent时按项目边界停止对应受管进程。

### 知识库与需求摄取

- 支持文本、PDF、Office文档、图片和安全公开在线文档快照。
- 长文档按真实Token分片，所有必需来源完整覆盖后才能自动派发。
- 工作项引用`source_id + checksum + chunk_ids`证据，不能引用兄弟任务或旧版本来源。
- 知识库提供词面与语义混合召回，支持本地多语言Embedding和外部Embedding。
- 索引使用generation和last-good策略，构建失败时继续服务上一份可用索引并明确降级原因。
- 上传、在线抓取、重定向和文件读取执行格式、大小、真实路径与SSRF安全门禁。

### 飞书、定时任务与AI报告

- 飞书仅直接连接全局 Agent和项目 Agent，不再建立群聊飞书直连。
- 同群不同话题、用户、项目和机器人应用使用独立会话、幂等身份与串行队列。
- 全局飞书任务派发到群聊后，进度、权限、验收和终态沿原来源回执返回。
- 日报和周报由模型基于不可变工作事件证据生成，每项结论必须引用真实事件。
- 报告生成失败时保留证据并显示可重试状态，不发送固定模板冒充AI总结。
- 会话回复和工作报告使用相互隔离的持久飞书发件箱。

### 工作台、搜索、监控与治理

- 工作台提供分页任务、项目、群聊、运行配置和阻塞操作入口。
- 会话搜索跨全局、群聊和项目建立脱敏索引，并严格保持作用域隔离。
- 任务回放按用户目标、执行步骤、完成内容、验证、变更文件和风险组织信息。
- 性能监控支持全局、群聊、项目范围，自定义日期、结构化状态筛选和分页执行记录。
- Trace、可靠性演练和清理中心使用持久租约、幂等回执与可恢复事务。
- 菜单采用Admin工作区默认与用户个人覆盖，导航布局不能扩大服务端权限。

### 音乐、通知与桌面宠物

- 音乐页面统一管理本地曲库、网易、B站、搜索、下载、播放队列、歌词、历史和音质升级。
- 浏览器负责实际音频输出；服务端负责索引、平台搜索、下载、持久命令、领取租约和播放回执。
- 新点歌使用latest-wins语义，旧下载完成后不能抢回播放权。
- 用户通知先写入持久通知中心，再投递网页、网页宠物、Electron宠物或精确飞书来源。
- 桌宠只显示脱敏短摘要，离线通知在重连后按游标补发。

### 本地认证与访问安全

- 新安装使用一次性安装码创建首个Admin，不提供公开默认密码。
- 内置Viewer、Operator和Admin角色，服务端能力门禁是唯一权威。
- 浏览器修改请求受会话、CSRF、Host和客户端指纹保护。
- 内部Agent调用使用带时间与nonce的HMAC签名，不因loopback地址自动可信。
- API Key存入本地加密凭据仓库；Prompt、Cookie、凭据和大工具原文不会写入公开Trace。

## 常用CLI

```text
ccm start                         前台启动
ccm start --background --open     后台启动并打开浏览器
ccm stop                          排空并停止服务
ccm restart --background          按原启动配置重启
ccm status                        查看服务和项目状态
ccm status --json                 输出结构化状态
ccm doctor                        检查Node、PTY、资源和Agent CLI
ccm open                          打开当前工作区
ccm logs --follow                 跟踪轮转日志
ccm setup-code [--rotate]         查看或轮换首次安装码
ccm update --check                检查新版本
ccm update                        验证并更新npm版本
ccm update --status               查看更新事务
ccm update --rollback             回滚更新
ccm agents                        查看开发Agent状态
ccm pet [stop]                    控制桌面宠物
ccm version                       查看版本
```

项目命令：

```text
ccm project list
ccm project connect <项目名>
ccm project disconnect <项目名|all>
ccm project runtime start <项目名> --profile <配置ID>
ccm project runtime stop <项目名>
ccm project runtime restart <项目名> --profile <配置ID>
ccm project runtime build <项目名> --profile <配置ID>
```

## 部署与本地数据

局域网访问需要显式监听网卡：

```bash
ccm start --background --host 0.0.0.0 --port 3080
```

公网部署建议让CCM继续监听`127.0.0.1`，使用Nginx、Caddy或Cloudflare Tunnel提供HTTPS，并通过`CCM_PUBLIC_ORIGIN`或CLI参数声明可信来源。不要直接暴露未加密HTTP登录入口。

默认数据目录：

```text
~/.cc-connect/
  configs/       项目、Agent与工作区配置
  logs/          服务、项目与运行日志
  sessions/      会话与连续性数据
  uploads/       受控附件与来源快照
  models/        本地Embedding模型缓存
  run/           服务身份、锁与生命周期状态
```

卸载npm包不会主动删除用户数据。停止服务并完成备份后，才能单独处理`.cc-connect`目录。

## 项目结构

```text
ccm/
  backend/                       Node.js/TypeScript服务端与Agent运行时
  frontend/                      Vue 3工作区界面
  integrations/                 飞书与独立MCP实现
  ccm-package/                  npm核心发布包与生产构建产物
  pet-assets-package/           按需下载的官方宠物资源包
  scripts/                       测试、审计、构建与发布工具
  docs/
    confirmed-project-architecture/  已确认项目结构
    confirmed-business-processes/    已确认端到端业务流程
```

权威业务覆盖清单位于[`scripts/project-coverage-manifest.json`](scripts/project-coverage-manifest.json)，GitHub可读矩阵由它确定性生成到[`docs/confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md`](docs/confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md)。

## 本地开发

```bash
npm install
npm --prefix frontend install
npm run build
```

开发服务器与生产构建：

```bash
npm --prefix frontend run dev
npm run build:frontend
npm run build:backend
npm run build:mcp-feishu
```

本地数据默认落在用户目录的`.cc-connect`。开发测试需要隔离数据时，应配置独立的测试目录和端口，不要复用正在运行的生产数据目录。

## 测试与发布

常用验证：

```bash
npm run coverage:check
npm run docs:check
npm run release:readme-check
npm run test:all
npm run build
```

发布候选：

```bash
npm run release:gate
node scripts/build-release-artifact.mjs
```

发布流程会生成：

- 固定版本npm tarball
- SHA256与npm integrity
- CycloneDX SBOM
- 核心包和宠物资源包物料清单
- Node 20/22与Windows/Linux安装矩阵证据
- 包体积、解压大小、文件数和可执行权限门禁

默认自动化测试使用Mock Provider，付费模型调用为0。真实Provider、飞书和外部Agent验收必须通过显式live入口启动。

## 文档

- [文档中心与阅读顺序](docs/README.md)
- [已确认项目结构](docs/confirmed-project-architecture/README.md)
- [已确认业务流程](docs/confirmed-business-processes/README.md)
- [全项目业务覆盖矩阵](docs/confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md)
- [当前实现状态](docs/CURRENT.md)
- [npm安装与服务生命周期](docs/confirmed-business-processes/NPM-CLI-SERVICE-LIFECYCLE.md)
- [自动开发完整链路](docs/confirmed-business-processes/AUTOMATIC-DEVELOPMENT-END-TO-END.md)
- [记忆系统完整链路](docs/confirmed-business-processes/MEMORY-SYSTEM-END-TO-END.md)
- [主Agent工具体系](docs/confirmed-business-processes/MAIN-AGENT-CC-STYLE-TOOLS.md)

## 外部条件与边界

- 第三方Agent、模型Provider、飞书租户、Git远端和外部媒体平台需要用户自己的账号、网络、权限与凭据。
- CCM不会绕过VIP、版权、地区限制、OAuth限制或远端仓库权限。
- 高风险、发布、部署、破坏性操作及无法证明副作用结果的恢复需要用户确认。
- 原始会话、任务、执行账本和历史回放不会因更新或压缩被批量删除。

## 问题反馈

- npm：<https://www.npmjs.com/package/@mumulinya167/cc-web>
- Issues：<https://github.com/mumulinya/ccm-web/issues>

提交问题时请提供CCM版本、操作系统、Node版本、复现步骤和脱敏后的错误信息。不要提交API Key、Cookie、OAuth验证码、完整Prompt或私有源码。

## License

MIT

---

<a id="english"></a>

## English

CCM Workspace is a local-first multi-agent development and workspace management platform. It brings global, group, and project main agents together with project development agents, TestAgent, persistent task execution, memory, MCP/Skills, knowledge retrieval, Git, terminals, Feishu/Lark, and task replay in one web workspace.

CCM is not just another chat page. It provides a recoverable delivery workflow from a user request, through source-grounded planning and delegated implementation, to independent verification and an accepted final result.

### Quick start

CCM requires Node.js 20 or newer.

```bash
npm install -g @mumulinya167/cc-web@latest
ccm start --background --open
```

The default URL is <http://localhost:3080>. CCM listens on `127.0.0.1` by default and does not expose the service to your LAN or the public internet automatically.

Useful diagnostics:

```bash
ccm status
ccm doctor
ccm logs --follow
```

### What CCM provides

- **Three main-agent scopes:** a global agent for cross-workspace coordination, group main agents for multi-project collaboration, and project main agents for source-grounded project work.
- **Controlled development agents:** Claude Code, Codex, Cursor, Gemini/Antigravity, OpenCode, and Qoder can execute project work inside permission and workspace boundaries.
- **Persistent development tasks:** development requests can continue while the browser is closed, survive service restarts, pause at safe checkpoints, and resume in place.
- **Planning and clarification:** ambiguous business requirements can be clarified before a detailed plan is confirmed and dispatched.
- **Readable live progress:** provider-native streaming, safe tool summaries, long-running build/test progress, project-agent status, and verification milestones are displayed without exposing hidden reasoning.
- **Independent acceptance:** TestAgent or main-agent self-verification produces evidence before Terminal Gate accepts a delivery.
- **Task replay:** plans, attempts, project assignments, evidence, verification, interruptions, recoveries, and final delivery can be reviewed later.
- **Context and memory:** conversation context, project memory, knowledge sources, MCP tools, and Skills are budgeted and loaded only when relevant.
- **Workspace tooling:** bounded Read, Glob, Grep, symbols, Git, build, test, terminal, PDF, image, Office, and notebook ingestion are available through controlled capabilities.
- **Feishu/Lark integration:** global and project sessions support inbound messages, images, files, persistent queues, progress feedback, and final replies.

### Core workflow

```text
User message / requirement document / image / attachment
→ exact conversation queue
→ main-agent read-only analysis and optional business clarification
→ detailed plan and user confirmation
→ persistent development task
→ project development agents in controlled worktrees
→ build, test, TestAgent or main-agent verification
→ Terminal Gate
→ final answer, file changes, execution record, and task replay
```

Ordinary questions and read-only analysis remain lightweight. A formal development task is created only when the request explicitly requires code, configuration, dependency, test, or build-script changes. The main agent reads, analyzes, plans, coordinates, and reviews; actual source modifications are delegated to controlled project development agents.

### Version 2.0.9 highlights

- Enhanced Global & Group Memory Management: Topic indexing, memory ledger, transaction isolation, distilled memory, dynamic memory window, and boundary journal with reactive compaction recovery.
- Advanced Agent Execution UX: Inline agent code diff rendering, nested child agent conversations, presented requirement plan cards with one-click confirmation, pre-plan clarification cards, conversation todo tracking, and collapsible read/search step headers.
- Context Engine & Multi-Provider Prompt Cache: Provider-neutral prompt caching and microcompaction lifecycle management to optimize token usage in long conversations.
- Real streaming and explainable progress are shared by global, group, and project conversations.
- Tool results use three levels: concise summary, user-readable results, and permission-aware technical details.
- Development-task classification no longer turns ordinary questions or read-only code analysis into heavy task records.
- Safe pause/resume, message intent routing, pre-plan clarification, Feishu attachment ingestion, conversation status, and away summaries are integrated with the existing task ledger.
- Only the current generation accepted by Terminal Gate is presented as a completed delivery.
- Workspace reads support continuation cursors, checksums, in-context deduplication, path suggestions, bundled ripgrep, cancellation, timeout, and partial-result recovery.

### Models and providers

CCM supports OpenAI-compatible, Claude-compatible, and Gemini-compatible provider configurations. Availability, model access, usage reporting, cache accounting, and cost reporting depend on the selected provider. CCM reports provider-returned Token and cost data; it does not fabricate missing usage or estimate an unreported cost as zero.

Third-party development runtimes require their own official installation, account, and authentication. CCM does not bypass provider, CLI, organization, or repository permissions.

### Common CLI commands

```bash
ccm start --background --open
ccm stop
ccm restart
ccm status
ccm doctor
ccm logs --follow
ccm update --check
ccm update
```

To make CCM reachable on a trusted LAN, explicitly choose a host and port:

```bash
ccm start --background --host 0.0.0.0 --port 3080
```

For public deployment, keep CCM bound to `127.0.0.1` and place an HTTPS reverse proxy or a secure tunnel in front of it. Do not expose an unencrypted login endpoint directly to the internet.

### Local data and security

Runtime data is stored under `~/.cc-connect` rather than the npm installation directory:

```text
~/.cc-connect/
  configs/       projects, agents, providers, and workspace settings
  logs/          service, project, and runtime logs
  sessions/      conversation and continuity data
  uploads/       controlled attachments and source snapshots
  models/        local embedding model cache
  run/           process identity, locks, and lifecycle state
```

CCM applies conversation and resource permissions, CSRF/Host protections, signed internal calls, project path boundaries, sensitive-file filtering, worktree isolation, and explicit approval for high-risk operations. Prompts, secrets, raw stdout, hidden reasoning, source bodies, and native third-party session identifiers are not included in normal execution records or task replay projections.

Uninstalling the npm package does not delete `~/.cc-connect`. Back up your data and stop the service before removing that directory manually.

### Development and release

```bash
npm install
npm --prefix frontend install
npm run check
npm run test:all
npm run build
```

The production npm payload is generated under `ccm-package/`. Release gates validate documentation, project coverage, tests, production builds, package manifests, installability, file modes, artifact size, and integrity metadata.

### Documentation and support

- [Documentation center](docs/README.md)
- [Confirmed architecture](docs/confirmed-project-architecture/README.md)
- [Confirmed business processes](docs/confirmed-business-processes/README.md)
- [Project coverage matrix](docs/confirmed-project-architecture/PROJECT-COVERAGE-MATRIX.md)
- [npm package](https://www.npmjs.com/package/@mumulinya167/cc-web)
- [Issue tracker](https://github.com/mumulinya/ccm-web/issues)

When reporting a problem, include the CCM version, operating system, Node.js version, reproduction steps, and sanitized error details. Never publish API keys, cookies, OAuth codes, full prompts, private source code, or raw internal logs.

### License

MIT
