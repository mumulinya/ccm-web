# CCM Workspace

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
- 首次运行会在后台准备本地知识库 Embedding 模型；下载失败不会阻止 CCM 启动，知识检索会明确降级。
- Electron 不随服务端安装。桌面宠物首次启动时按需准备桌面运行时，纯 Web 或 Linux 服务器无需下载。

检查安装状态：

```bash
ccm status
ccm doctor
ccm logs --follow
```

## 2.0.7 更新重点

- 主 Agent文件读取升级为安全续读闭环：批量读取会稳定保留原文件集合，一键继续读取未完成内容，并通过checksum阻止文件漂移后误拼接旧结果。
- 同一模型上下文内的重复读取会返回未变化状态，避免重复注入正文与重复计算Token；新任务、压缩、恢复或generation变化后会重新读取权威内容。
- Glob和Grep优先使用npm随包安装的ripgrep，系统ripgrep和Node安全实现作为降级；搜索支持超时、取消和已完成部分结果保留。
- 文件路径不存在时返回受项目权限、敏感文件和真实路径边界约束的候选建议，不会猜测或暴露越界文件。
- 全局、项目和群聊使用同一套只读工作区工具与展示；主 Agent负责读取、分析和规划，代码修改仍由受控项目开发 Agent执行。

- 修复全局 Agent 上下文边界白名单遗漏，恢复全局飞书会话和“继续”操作的正常执行。
- 全局、项目和群聊统一接入可恢复任务队列、阶段计划、执行记录与任务回放；服务重启后保留任务现场和会话连续性。
- Agent 指标覆盖主 Agent、项目子 Agent 和 TestAgent，支持真实 Token、费用、阶段耗时与进程资源观测；未提供 usage 时明确显示原因。
- 运行中的文件查询按“读取文件、查找文件、搜索代码、检查 Git、运行验证”分层展示，普通消息不暴露原始 Shell 命令。

### 代码智能与精确源码定位

- 新增三栏代码智能工作台，统一项目/文件/符号树、语义查询、诊断、调用关系、只读源码定位和Agent投递。
- 支持工作区符号、文件符号、定义、引用、实现、类型定义、调用者、被调用者和代码诊断九类查询。
- 查询使用精确文件、行和列定位，并绑定索引generation、RepoStateIdentity、Evidence和结果checksum；代码变化后旧结果会标记为陈旧。
- TS/JS语言服务随包可用；Vue、Python、Go、Rust、Java、Kotlin、C/C++、C#、PHP、Ruby、Lua、HTML、CSS和JSON可通过管理员确认的标准LSP接入。
- 索引按需异步建立并增量维护。缺少语言服务时明确返回能力不可用，不使用Grep伪造定义、引用或调用关系。
- 源码正文仅在当前页面按位置有界重读，使用`no-store`响应；索引、Evidence、查询历史和JSON/CSV导出均不保存源码正文。

### 可观察的Agent执行与严格验收

- 普通对话保持轻量；真实工具、Skill、MCP和项目Agent执行才显示CC风格进度说明与折叠详情。
- 开发任务按准备检索、用户可读计划、项目Agent、TestAgent、返工复验、主Agent总结和文件交付展示。
- Claude Code、Codex、Cursor、Gemini/Antigravity、OpenCode和Qoder使用Agent Communication V2结构化ACK、进度、Result和CCM终态回执。
- 新任务必须在写入前完成真实ACK；第三方Agent不汇报业务进度时，CCM只显示可验证的心跳、结构化工具、文件或验证状态，不猜测自由格式stdout。
- 第三方Result不会直接宣布完成；只有当前RepoState下的Evidence、TestAgent或主Agent自验及Terminal Gate全部通过后才显示最终交付。

### 动态上下文、记忆连续性与跨会话投放

- MCP支持`deferred`、`auto`、`inline`加载；Skill目录、已调用Skill恢复、来源正文和输出预留按模型真实容量动态预算。
- Skill可选择`inline`或`context: fork`；压缩后重新校验Skill hash、授权和MCP Schema。
- 知识库和共享文件正文仅进入当前Agent Loop，长期只保存无正文引用与版本回执；恢复时从权威存储重新读取。
- 全局Agent、工作台和需求池投放任务时只选择项目或群聊，系统自动解析对应的自动化任务会话。
- 来源任务与目标会话支持双向跳转，同一任务卡原位更新计划、执行、验收、返工、文件变化和最终总结。

## CCM 能做什么

### 1. 三类主 Agent 与统一 Agent Loop

- **全局 Agent**：处理普通问答、全局状态、目标选择以及跨群聊、跨项目任务派发。
- **群聊主 Agent**：在精确群聊会话内读取成员项目能力，制定跨项目计划并协调项目子 Agent。
- **项目主 Agent**：绑定单个项目，按需读取源码、Git、运行日志、知识和项目工具后回答或创建任务。
- 三类主 Agent 共用一套受控工具核心，但会话、记忆、队列和权限边界彼此隔离。
- 普通问候由主 Agent 首轮直接回答；真正需要信息时才按需加载源码、知识、Skill 或 MCP。

### 2. 自动开发与任务验收

```text
需求 / 文档 / 图片 / 附件
→ 主 Agent读取相关源码并制定计划
→ 项目开发 Agent按工作项执行
→ TestAgent独立验收或主 Agent自验
→ 失败后生成精确返工项
→ 最终验收、原会话回传和任务回放
```

- 需求池、全局 Agent、工作台、群聊和项目会话使用同一套任务事实与状态机。
- 任务按精确会话串行执行，支持排队、阻塞、重试、停止当前执行、永久取消与安全恢复。
- 中断时保留任务、计划、源码证据和项目子 Agent 原生会话；能够证明安全时续跑同一任务。
- TestAgent 可独立检查命令、HTTP和浏览器验收；关闭后会明确切换为主 Agent 自验，不伪装成独立验收。
- 任务详情和回放展示用户目标、执行步骤、验证结果、变更文件、风险及折叠的排障信息。

### 3. CC 式上下文与记忆系统

- 全局、群聊和项目使用精确会话隔离的完整对话链。
- 未超限时传递完整轮次；超过真实 Token 容量时先执行正式模型压缩，不用字符截断冒充摘要。
- 原始 transcript、隐藏工具执行账本和历史摘要保留，压缩不会删除事实来源。
- Skill正文和延迟 MCP Schema按需加载；压缩后只恢复已实际调用的Skill和已加载工具状态。
- MicroCompact只处理足够旧、已配对且满足上下文压力条件的工具结果。
- 记忆中心展示系统提示、规则、Skill、MCP、会话、Token、压缩边界、缓存使用和恢复来源。
- Provider支持时读取真实上下文缓存回执；无法证明原生缓存时使用CCM受控上下文投影，不伪装成Provider KV缓存。

### 4. MCP、Skill 与主 Agent只读工具

- 主 Agent原生支持提问用户、Todo、计划、Skill调用、工具搜索、任务派发和状态读取。
- 内置只读工作区工具覆盖目录、Glob、Grep、分段文件读取、定义/引用、Git状态/Diff/历史、运行状态与日志。
- 群聊和项目主 Agent只能读取授权项目，不能直接获得源码写入、Shell或Worktree权限。
- 用户可按全局、群聊和项目作用域配置MCP与Skill；项目开发 Agent按任务继承精确授权快照。
- 工具市场对社区和自定义工具执行来源检查、隔离预览、Admin确认、运行时测试和授权重同步。
- MCP/Skill调用写入精确会话隐藏执行账本，不生成重复聊天气泡。

### 5. 开发 Agent运行时

CCM负责统一配置、派发、上下文交付和回执验收，实际CLI需要用户自行安装并登录。

| 运行时 | 用途 |
| --- | --- |
| Claude Code | 项目开发与原生会话续跑 |
| Codex CLI | 项目开发、模型选择与会话续跑 |
| Cursor Agent | 项目开发与本机登录态执行 |
| Antigravity CLI | Google账号体系的开发Agent适配 |
| OpenCode | 多Provider开发运行时 |
| Qoder CLI | 可选项目开发运行时 |

设置页可检查安装、版本、登录状态、可用模型和真实只读测试。CCM不会替用户创建第三方账户或付费凭据。

### 6. 项目、Git 与运行控制台

- 项目管理支持本地目录、分组、GitHub仓库、JDK/Maven/Gradle和多套运行配置。
- 项目主 Agent可只读检索项目源码并制定带文件证据与checksum的计划。
- Git工作区支持分页状态、Diff、精确文件提交、fetch、fast-forward pull、push和可核验操作回执。
- 同一仓库写操作串行；状态漂移、路径越界、符号链接和隐式全量提交会被服务端拒绝。
- 内置终端支持PTY与xterm；平台无法加载`node-pty`时使用兼容命令模式，核心服务仍可运行。
- Java项目以Maven/Gradle源码运行配置启动，不强制先打JAR。

### 7. 知识库与附件摄取

- 支持文本、PDF、Office文档、图片和安全的公开在线文档快照。
- 长文档按真实Token切成完整分片，每个工作项引用可核验来源分片，资料覆盖不足时阻止自动派发。
- 知识库提供词面与语义混合召回；默认可使用本地多语言Embedding，也可配置外部Embedding。
- 索引采用generation和last-good策略，重建失败时保留上一份可用索引并明确标记降级。
- 上传、在线抓取和文件读取包含大小、格式、路径与SSRF安全门禁。

### 8. 飞书双向会话与AI工作报告

- 飞书正式支持**全局 Agent**和**项目 Agent**双向会话。
- 同群不同话题、用户、项目和机器人应用使用独立会话与队列。
- 群聊不直接绑定飞书；全局任务分派到群聊后，进度与终态沿原来源回执返回全局飞书会话。
- 日报和周报由模型基于不可变工作事件证据生成，证据校验失败时不会发送固定模板冒充AI总结。
- 飞书投递使用持久发件箱、稳定去重和有限重试，不会把业务正文降级发送到其他Webhook。

### 9. 工作台、监控与恢复

- 工作台集中展示任务、项目、群聊、运行配置和需要用户处理的阻塞事项。
- 性能监控支持全局、群聊和项目范围，自定义日期、结构化状态筛选和执行记录分页。
- Trace、可靠性演练、清理中心和任务回放使用持久回执，服务重启后可恢复未完成操作。
- 清理采用预览、确认、持久事务和逐项结果，不用一次性删除伪装原子操作。
- Viewer、Operator、Admin角色在服务端执行真实RBAC门禁。

### 10. 音乐平台、通知与桌面宠物

- 音乐页面统一管理本地曲库、网易、B站、搜索、下载、播放队列、歌词、历史和音质升级。
- 浏览器是实际音频输出端，服务端负责搜索、下载、持久命令、领取租约和播放回执。
- 最新点歌优先，新请求会使旧播放意图失效，防止旧下载完成后抢回播放权。
- 用户通知先持久化，再投递网页通知中心、网页宠物、Electron宠物或精确飞书来源。
- 桌宠只显示脱敏短摘要；离线期间的通知会在重连后补发。

## 模型与Provider

CCM可连接OpenAI、Anthropic、Gemini及其兼容接口，也支持用户自定义中转站。不同接口是否具备原生上下文缓存取决于实际协议和服务端回执。

- API Key保存在本地加密凭据仓库，页面状态与日志不返回明文。
- Provider请求使用分级超时、有限重试和任务级冷却。
- 普通问答使用快速预算；计划、压缩、开发和验收使用适合长任务的独立预算。
- 模型不可用时保留原始会话和待处理状态，不使用关键词规则伪造语义结论。

## 常用CLI

```text
ccm start                         前台启动
ccm start --background --open     后台启动并打开浏览器
ccm stop                          排空并停止服务
ccm restart --background          按原启动配置重启
ccm status                        查看服务与项目状态
ccm status --json                 输出结构化状态
ccm doctor                        检查Node、PTY、资源和Agent CLI
ccm open                          打开当前工作区
ccm logs --follow                 跟踪轮转日志
ccm update --check                检查新版本
ccm update                        验证并更新npm版本
ccm version                       查看版本
ccm agents                        查看开发Agent状态
ccm pet                           启动桌面宠物
ccm pet stop                      停止桌面宠物
```

项目命令：

```text
ccm project list
ccm project connect <项目名>
ccm project disconnect <项目名>
ccm project runtime start <项目名> --profile <配置ID>
ccm project runtime stop <项目名>
ccm project runtime restart <项目名> --profile <配置ID>
ccm project runtime build <项目名> --profile <配置ID>
```

旧项目命令保留兼容映射，但新脚本建议明确区分Agent连接和源码运行。

## 局域网、服务器与公网部署

局域网访问需要显式监听网卡：

```bash
ccm start --background --host 0.0.0.0 --port 3080
```

其他设备访问 `http://<服务器IP>:3080`。请同时配置系统防火墙和云安全组。

公网部署建议让CCM继续监听 `127.0.0.1`，使用Nginx、Caddy或Cloudflare Tunnel提供HTTPS，并通过 `CCM_PUBLIC_ORIGIN` 或CLI参数声明可信公网来源。不要直接将未加密HTTP登录入口暴露到公网。

同一数据目录只允许一个CCM实例。并行测试实例应分别配置独立数据目录与端口。

## 本地数据与安全

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

- 新安装使用一次性安装码创建首个Admin，不使用公开默认密码。
- 浏览器修改请求受会话、CSRF、Host和客户端指纹保护。
- 内部Agent调用使用带时间与nonce的HMAC身份，不因loopback地址自动可信。
- 原始Prompt、API Key、Cookie、下载签名和无限长工具结果不会写入Trace公开投影。
- CCM是共享本地工作区；当前项目、任务和曲库默认不按登录用户拆分所有权。

## 升级、备份与卸载

升级前建议先查看并备份数据目录：

```bash
ccm status
ccm update --check
ccm update
```

更新失败时可查看：

```bash
ccm update --status
ccm logs --follow
ccm doctor
```

卸载程序不会主动删除 `~/.cc-connect`：

```bash
ccm stop
npm uninstall -g @mumulinya167/cc-web
```

需要完全清除数据时，请在确认备份后单独处理 `.cc-connect`。不要在服务运行时直接删除该目录。

## 常见问题

### 页面打不开

```bash
ccm status
ccm logs --follow
ccm doctor
```

确认访问的是`ccm status`返回的host和port。端口被其他程序占用时，CCM会失败退出而不会伪装启动成功。

### Agent显示未登录或测试失败

先在系统终端完成对应CLI的官方登录，再回到设置页重新检查。登录、模型权限和网络由第三方服务控制；网页打开不代表CLI凭据已经写入成功。

### 终端无法使用PTY

运行`ccm doctor`检查`node-pty`。缺失时可继续使用兼容命令模式；完整交互式CLI需要平台支持的原生模块。

### 飞书消息没有回复

确认绑定目标是全局Agent或项目Agent，并检查飞书连接、精确会话队列和持久发件箱状态。群聊不再作为直接飞书入口。

### 本地知识模型未准备完成

服务启动不等待模型下载。可在知识库设置查看进度、重试或切换为外部Embedding/仅词面检索。

## 外部条件与使用边界

- 第三方Agent、模型Provider、飞书租户、Git远端和外部媒体平台需要用户自己的账号、网络、权限与凭据。
- CCM不会绕过VIP、版权、地区限制、OAuth限制或远端仓库权限。
- 主Agent默认使用只读源码工具；实际代码修改由项目开发Agent在授权任务中执行。
- 高风险、发布、部署、破坏性操作及无法证明副作用结果的恢复需要用户确认。

## 源码与文档

- GitHub：<https://github.com/mumulinya/ccm-web>
- 问题反馈：<https://github.com/mumulinya/ccm-web/issues>
- 完整业务流程：<https://github.com/mumulinya/ccm-web/tree/main/docs/confirmed-business-processes>
- 已确认架构：<https://github.com/mumulinya/ccm-web/tree/main/docs/confirmed-project-architecture>

## License

MIT
