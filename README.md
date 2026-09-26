# CCM Workbench

<p align="center">
  <a href="#中文">中文</a> · <a href="#english">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/ccm-app-icon.png" alt="CCM Workbench" width="96" height="96" />
</p>

<p align="center">
  <strong>本地优先的多 Agent 协作、自动开发与工作区管理平台</strong><br />
  <em>Local-First Multi-Agent Collaboration, Autonomous Development & Workspace Control Plane</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mumulinya167/cc-web"><img src="https://img.shields.io/npm/v/@mumulinya167/cc-web" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/storage-local--first-0f766e" alt="Local first" />
  <img src="https://img.shields.io/badge/architecture-agentic--loop-8b5cf6" alt="Agentic Loop" />
</p>

<a id="中文"></a>

## 中文

CCM（CC-Web）将**全局助手**、**群聊主 Agent**、**项目主 Agent**、**项目开发 Agent**、**TestAgent 独立验收**、**会话长短期记忆**、**MCP/Skill 体系**、**知识库**、**Git 工作区**、**终端**、**飞书协作**与**任务执行回放**深度整合进同一个本地优先的工作区。

CCM 不是简单的单聊 Web 界面，而是一套从**需求结构化输入**、**源码深度感知规划**、**子 Agent 隔离执行**、**独立自动化验收**到**最终确定性交付**的完整工业级自愈工作流。

---

## 快速开始

> 运行要求：**Node.js 20 或更高版本**（推荐 LTS 版本）。

### 1. 安装与启动

```bash
npm install -g @mumulinya167/cc-web@latest
ccm start --background --open
```

默认 Web 访问地址：**<http://localhost:3080>**

- **安全边界**：默认仅监听 `127.0.0.1` 本地回环，不主动向局域网或公网暴露端口。
- **数据隔离**：所有用户账户、项目定义、会话记录、任务账本及运行状态持久化存储于 `~/.ccm`，绝不污染全局 npm 安装目录；旧版 `~/.cc-connect` 仅作为只读向下兼容源。
- **渐进式准备**：首次启动将在后台自动预热本地知识库 Embedding 模型；即使离线或下载中断，核心控制台仍正常拉起，检索能力平滑降级。
- **轻量按需**：桌面宠物基于 Electron 按需独立准备，服务端和纯 Web 模式零额外依赖开销。

### 2. 基础运维与诊断

```bash
ccm status            # 查看当前守护进程、端口与项目状态
ccm doctor            # 全面体检：Node.js、PTY 终端、第三方 CLI 与系统环境
ccm logs --follow     # 实时查看服务端轮转日志
```

---

## 发布包与源码仓库

- **npm 生产发布包**：<https://www.npmjs.com/package/@mumulinya167/cc-web>
- **发布产物仓库**：<https://github.com/mumulinya/cc-web>
- **完整开源工程（源码、测试套件与详细架构文档）**：<https://github.com/mumulinya/ccm-workbench>
- 生产环境启动安装包中编译后的 `dist/server.js`；源码仓库二次开发请先执行 `npm run build`。

---

## 核心架构与特性矩阵

| 核心维度 | 关键能力实现 | 业务价值与优势 |
| :--- | :--- | :--- |
| **Token用量审计** | 统一 Provider Usage 归一化 + 读/写/直接输入精准计量 + 零重复失真 | 彻底解决跨 Provider 统计口径不一，用量与真实账单 100% 对应 |
| **单调追加缓存** | Append-Only v11 协议排布 + 静态公共指令锁 + 公共工具指纹 Profile | 跨会话长前缀稳定不击穿，可变控制与静态前缀彻底解耦，提速降本 |
| **多模态与语音转录**| 抖音 MCP ASR 语音转录（SiliconFlow/Whisper/火山）+ 智能短链文案提取 | 视频内容秒级文本化，打通音视频探索、自动化下载与智能转录全链路 |
| **极致流式渲染** | 50ms 增量合并 + 同帧滚动单次读写 + 过程/最终回答阶段传输信号 | DOM 替换次数减少 90%，彻底消除长回答流式卡顿与重绘抖动 |
| **内存与缓存配额** | 独立物化缓存策略 + 4MB 单项与 8MB 单会话上限 + 超大单次免击穿 | 杜绝单次超大工具输出击穿全进程缓存，长效保障高并发内存平稳 |
| **轮次意图与路由** | 结构化意图决策 + 歧义输入安全收敛（needs_route） + 校验和防重 | 彻底理清任务暂停/恢复插话，防止歧义输入破坏运行态与历史账本 |
| **闭环验收与返工** | 待验收阶段支持批准交付与提修改（revise） + 自动返工工作单流转 | 交付标准透明可溯，一键触发增量返工流水线并检测版本冲突 |
| **安全并发批次调度** | 完整模型返回批次边界 + 纯只读受控并发 + 严格声明顺序物化 | 杜绝读写交叠竞态，消除工具提前执行乱序，并发开销可控 |
| **证据真实性与防重** | 只读失败有限重试（最多3次） + 真实哈希校验短路（file_unchanged） | 消除过度去重死锁，杜绝虚假文件命中，确保上下文证据真实 |
| **Responses 原生保真** | reasoning/encrypted_content 完整回放 + 本地 Token 估算去重 | 原生思维链与加密项无损回放，修复本地 Token 虚增，严防跨域污染 |
| **多 Agent 协作网络** | 全局 Agent + 群聊主 Agent + 项目主 Agent + 隔离项目 Worker | 明确角色职责边界：主 Agent 只读规划，子 Agent 隔离执行 |
| **企业协同与多端集成** | 飞书双向会话与自动化工作报告 + 多协议终端 PTY + 可互动桌宠 | 多端消息直通工作区，会话事实自动生成可信工作日报/周报 |

---

## 4.0.0 重大里程碑与版本演进

在 4.0.0 重大版本中，CCM 完成了全链路 Provider Token 用量与缓存命中审计归一化、Append-Only 严格单调追加缓存排布（v11）、抖音原生 MCP ASR 语音识别与智能转录、以及服务实例单例锁与存储可靠性的全面升级：

### 1. 统一模型 Token 用量与缓存命中审计标准化（Provider Usage Normalization & Audit）
- **独立归一化核心（provider-usage.ts）**：彻底终结不同 Provider（OpenAI Responses / Chat Completions、Anthropic、Gemini、中转代理）对 `input_tokens`、`cached_tokens`、`cache_read_input_tokens`、`cache_creation_input_tokens` 口径不一、重复计费或计算错误的问题。
- **细粒度四维度计量**：清晰拆分直接输入（`directInputTokens`）、缓存读入（`cacheReadInputTokens`）、缓存创建（`cacheCreationInputTokens`）和补全输出（`outputTokens`），实现跨 Provider 确定性精确核算，彻底杜绝缓存命中 token 与未命中输入 token 混算失真。
- **全局诊断与可视化透出**：三端会话上下文明细与诊断看板直观展现缓存命中率与节约比例，真实反映每一次模型调用的底层数据流动。

### 2. 三端 Append-Only 严格单调追加缓存排布（Provider Cache Append-Only Wire Layout v11）
- **v11 单调追加排布标准**：演进至 `ccm-append-only-v11` 协议排布标准，将完整确定性的公共指令集固定在系统前缀首位，后续轮次仅严格做增量追加。
- **动态控制与静态前缀彻底解耦**：彻底阻断可变运行时状态（如工具动态发现、会话临时指令、任务编排控制）侵入导致的前缀哈希变更，保证长会话前缀指纹恒定不破裂。
- **公共工具指纹 Profile（provider-cache-public-profile.ts）**：基于工具 Schema 指纹（`toolSchemaChecksum`）生成公共工具 Profile，实现跨会话跨项目长前缀大缓存复用，杜绝私有环境与参数泄露。

### 3. 多模态工作台升级：抖音 MCP ASR 语音识别与智能转录（Speech-to-Text & Transcripts）
- **原生 ASR 音视频智能转录**：抖音原生 MCP 桥接深度打通自动语音识别（ASR）能力，全面支持单视频转录（`transcribe_video`）与多视频批量转录（`batch_transcribe`）。
- **多模型服务商生态接入**：原生支持 SiliconFlow（硅基流动 SenseVoice）、OpenAI Whisper、火山引擎（Volcengine）及自定义 Custom ASR 服务；密钥凭证隔离存储（`protectCredential`），在音乐设置面板中提供可视化配置与实时连通性探测。
- **智能文案提取与短链解析**：支持直接粘贴抖音 App“保存链接”或“复制链接”产生的完整包含标题、表情与标点的复杂文案，自动过滤修饰字符并秒级提取核心短链与视频 ID。

### 4. 服务单例互斥锁与持久化存储高可靠（Server Instance Lock & Storage Reliability）
- **服务实例进程锁（server-instance-lock.ts）**：保障端口与工作区文件数据库的多实例互斥与平滑热重启，杜绝并发多进程启动对同一工作区状态造成的数据污染与端口抢占。
- **任务存储（task-store.ts）与核心 DB 健壮性**：增强并发读写与断电恢复自愈能力，会话事件与任务账本保证写入原子性。

### 5. 前端交互与工作区全景看板演进
- **全景缓存诊断看板（SessionCacheDiagnostics.vue）**：直观展示缓存读入、缓存创建与直接输入占比，支持移动端自适应布局。
- **终端体验优化（Terminal.vue）**：增强 PTY 终端渲染平滑度与会话重连弹性，多终端切换不卡顿。

---

## 3.0.10 历史版本特性回顾

在 3.0.10 版本中，CCM 全面增强了本地物化内存缓存分级配额控制、会话轮次意图结构化解析与安全路由、以及任务生命周期中待用户验收的自动返工闭环流转：

### 1. 本地物化缓存分级配额与防击穿保护（Local Materialization Cache Budget）
- **细粒度内存分级管控**：提取独立 `provider-local-materialization-cache` 策略模块，确立单项条目上限（4MB）、单会话上限（8MB）、全局条目（128 项）与全局内存上限（32MB）四级防线。
- **超大工具结果免击穿保护**：当单次工具返回超大代码或检索结果（超过单项 4MB 阈值）时，采用单次即时物化服务，不常驻热内存缓存，彻底杜绝单次大型工具调用将工作区其他活跃会话缓存全部逐出的隐患，新增 `oversizeSkips` 审计指标。
- **公共前缀与私有会话严格隔离**：细化公共前缀块划分（`publicStablePrefixBlockCount`），协议适配器可在跨项目公共前缀边界设置断点，严密防止私有指令污染全局缓存键。

### 2. 会话轮次意图结构化决策与安全路由（Conversation Turn Intent Resolution）
- **意图决策接口（/resolve-intent）**：新增 `/api/conversation-turns/resolve-intent`，统一解析用户恢复与插话动作，支持 `resume_original`、`resume_with_instruction`、`new_turn`、`steer_original` 等标准决策类型。
- **模糊恢复输入安全收敛**：用户在任务暂停或中断后输入补充说明时，系统智能识别“补充原任务”还是“开启新任务”；如遇歧义安全转入 `needs_route` 状态，复用路由引导卡片等待用户确认，杜绝歧义输入导致的任务状态破坏或误执行。
- **校验绑定与版本防篡改**：引入 `binding_checksum` 校验机制，严密绑定 turn、revision、attempt 与会话作用域，防止网络延迟下的重复动作生效。

### 3. 任务生命周期标准化与用户验收返工流转（Task Lifecycle & Acceptance Revise）
- **验收阶段双向决策闭环**：完善待用户验收（`awaiting_user_acceptance`）状态机，除常规批准（`accept`）外，原生支持提出修改要求（`revise`）。
- **自动化返工（Rework）工作单流转**：用户提出返工修改意见时，后端自动生成独立 `attemptId`，将前序验收标记为 `superseded`，任务平滑流转为 `reworking` 状态，并自动入队继续执行返工流水线，保留完整时间线历史。
- **输出版本冲突保护（output_revision）**：操作严格校验 `output_revision`，一旦任务已生成新最终输出则返回 `TASK_ACCEPTANCE_VERSION_CONFLICT`，从根本上防止基于陈旧输出的脏操作。

### 4. 前端三端全生命周期体验闭环
- **任务卡片与回放交互增强**：项目、群聊、全局全面接入最新的任务卡片验收与返工动作，无缝展示返工进度与修改时间线。
- **输入框智能状态引导**：在用户确认路由与意图期间，输入框精确联动状态，杜绝等待期间的假性错误报错。

---

## 3.0.9 历史版本特性回顾

在 3.0.9 版本中，CCM 全面升级了三端 Agent 流式渲染性能、工具批次调度边界与只读受控并发、工具重复调用有限重试与文件证据校验、以及 Responses 原生 output 项回放保真：

### 1. 三端 Agent 流式渲染极致优化与阶段信号（Streamed Markdown Render & Phase Signaling）
- **高频增量智能合并（useStreamedMarkdown）**：项目、群聊、全局统一接入 `useStreamedMarkdown` 组合式函数，在 50ms 渲染窗口内合并密集 Markdown 片段增量；固定高密样本下正文 DOM 替换次数从 121 降至 12（削减 90% 以上），首段文本与稀疏增量保持零延迟即时呈现。
- **自动滚动同帧合并**：同帧发起的多次滚动请求自动合并为 1 次布局读写，彻底消除超长回答流式输出时的布局抖动与重绘卡顿；智能保留用户上翻脱离底部的阅读位置，支持容器切换、会话重置与初次挂载自动补偿。
- **传输阶段协议信号（answerPhase）**：原生模型循环协议引入 `[[CCM_PROCESS]]`（过程说明）与 `[[CCM_FINAL]]`（最终回答）传输阶段标记；后端实时派发 `model_activity.answerPhase` 并在传输前净化正文，前端在最终回答到达时平滑折叠思考过程；若后续流式中再次声明工具则自适应恢复工具复核，保证执行记录完整不丢失。

### 2. 三端工具调度统一与完整批次边界（Native Tool Scheduling & Batch Boundary）
- **完整模型批次调度边界**：流式声明阶段仅展示准备活动，彻底杜绝未接收完整批次即凭参数提前执行导致的时序错乱与读写交叠风险；整批参数齐备并持久化检查点后，统一进入权限与调度队列。
- **纯只读批次受控并发**：整批均为只读策略确认时允许受控并发执行（按轻/中/重任务并发限制 10/6/4，群聊每项目上限 2），读写混合批次、工具发现、Skill/规范加载与写操作保持严格串行。
- **声明顺序严格回灌**：工具执行结果按调用 ID 严格归位，按模型原始声明顺序物化回灌到上下文，消除并发完成先后对模型上下文的扰乱；执行取消或异常时安全等待在途调用，旧 attempt 无法污染新 attempt。

### 3. 工具重复调用有限放行与真实哈希证据校验（Tool Repeat Policy & File Evidence Integrity）
- **只读临时失败有限重试**：经适配器明确判定的只读工具，临时失败后允许模型使用新调用 ID 以相同参数请求重试，单参数连续失败最多放行 3 次（首次加 2 次重试），杜绝盲目去重导致的推理中断；写入、控制工具与未确认只读工具持续保持防重保护。
- **同批次相同参数去重与 JSON 降级对齐**：同批次内相同参数只执行一次并按各调用 ID 映射结果；JSON 降级路径完整记录阻止结果，杜绝静默遗漏。
- **真实文件内容哈希复用（file_unchanged）**：`file_unchanged` 前置条件由简单大小/修改时间判断收紧为真实文件内容哈希校验，且必须满足当前精确会话历史中已包含完整选择正文，杜绝文本内容被篡改或正文被截断时的伪命中。

### 4. Responses 原生回放保真与本地 Token 估算去重（Responses Native Replay & Token Deduplication）
- **原生 Output 项完整保真**：Responses 协议流式与非流式返回均完整保留已支持的原生 output 项（包含 reasoning 项、encrypted_content、消息 phase 及交错原始顺序），下一轮请求与跨进程检查点恢复优先使用原生项。
- **本地 Token 估算去重**：工具专用 assistant 消息的本地 token 估算剔除内部回放副本与加密字节，避免本地估算虚增（固定样本下从 275 token 降至 87 token）。
- **Provider 默认保留策略与凭据绑定**：缓存策略始终采用 Provider 默认保留，消除非标准的固定 ttl 或 prompt_cache_retention；原生回放元数据绑定 Provider、模型及凭据摘要哈希，切换模型或凭据时不发生 cross-provider 污染。

---

## 3.0.8 历史版本特性回顾

在 3.0.8 版本中，CCM 完成了模型输入跨会话缓存深度复用、原生工具按需动态发现加载、会话抢占并发竞争消除与只读观察器的重大升级：

### 1. 三端模型输入去重与跨会话缓存复用（Model Input Deduplication & Cache Reuse）
- **单份正文与审计分离**：项目、群聊、全局全面统一模型工具结果投影；原始执行细节按脱敏规则持久化于 `~/.ccm/workspace-execution-audit/`，大模型请求仅发送一份单层紧凑模型正文，本地 Token 估算开销直降 50%+。
- **模型历史检查点（Session Model Checkpoint）**：引入 `session-model-checkpoint` 机制，按 scope、scopeId 及精确 sessionId 哈希物理隔离；真实工具声明批次与调用 ID 按严格顺序物化，消除并行工具执行导致的乱序与重复副作用，杜绝旧运行复活已删除历史。
- **跨会话路由键复用**：`ccm-v2-` 路由键基于用户配置、工作区、Provider/模型与角色指令共享，跨会话保持长前缀缓存，长空闲时间不击穿 Provider 缓存。
- **精准局部 JSON 提取（read_json_fields）**：新增只读 `read_json_fields` 工具，支持按 JSON Pointer 提取特定节点、字段校验和与未变短路（`file_unchanged`），避免大型 JSON 数据无谓全量读入。

### 2. 原生工具按需动态发现与按需加载（Native Tool On-Demand Discovery）
- **工具模式按需按序加载**：重构 `native-tool-catalog`，彻底阻断旧版将所有未加载 MCP 工具模式（Schema）全量展开的问题；仅向模型提供已声明加载的工具定义，默认 deferred 策略不被适配器覆盖。
- **单次请求输入开销削减 68%**：单次模型调用中共享工具 Schema 的 Token 消耗从 ~5,400 token 暴降至 ~1,600 token，大幅降低 API 调用费用并显著提速首字响应（TTFT）。
- **工具连续动态恢复**：原生工作区支持从连续证据快照恢复工具选择，校验校验和与当前 generation；全局上下文连续加载保留管理工具，保障多轮交互中工具调用的确定性与安全边界。

### 3. 会话抢占竞争消除与只读观察器（Conversation Turn Observation）
- **只读观察接口（/observation）与编辑门禁彻底解耦**：新增 `/api/conversation-turns/observation`，发送归属确认与状态流接入统一采用只读模式；将排队编辑（`/detail`）与流观察完全隔离，杜绝后台 worker 抢先领取消息导致的 `QUEUE_EDIT_NOT_ALLOWED` 并发竞争。
- **三端共享队列保护与防丢失退回**：入队成功后若刷新失败完整保留服务端消息；切换会话时尚未执行的消息按原 attempt_id 与 revision 安全退回队列，防止前端切换会话将任务误判为失败。
- **断线指数退避重连与自愈**：观察连接断开或未收到终态时，按 1s/2s/4s/8s/15s 指数退避自动重连；回放完毕立即终结连接，杜绝死循环重试。

### 4. 结构化验收合同与 Git 审计证据账本
- **结构化验收合同（Acceptance Contract）**：规范化 TestAgent 与项目主 Agent 的验收闭环，每一项指标均严密对应需求、代码边界与工作单。
- **Git 审计与用户可见投影**：全自动 Git 变更审计与不可篡改证据账本，保障代码交付透明可信。

### 5. 跨平台多模态音视频工坊与抖音原生 MCP
- **抖音 MCP 原生桥接服务**：全面引入抖音原生 MCP 桥接服务（`douyin-mcp`），深度打通短视频/音频/热榜聚合探索（`DouyinExplorer`），提供精细化元数据解析与自动化流式下载。
- **高可用 HLS 自适应流式播放**：自适应 HLS 发布机制与视频主舞台（`MusicMainVideoStage`），支持网易云 MV 与 B 站跨平台音视频沉浸体验。

### 6. OpenAI Responses WebSocket 双向流式传输与自愈降级
- **原生双向 WebSocket 协议**：毫秒级双向长连接流式交互，全自动握手探测与心跳保活；遇到网络或代理限制时透明平滑回退至 HTTP fetch。

---



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

<p align="center">
  <img src="https://raw.githubusercontent.com/mumulinya/ccm-web/main/public/panda_mascot.png" alt="CCM Mascot" width="140" />
</p>

- **多媒体工坊**：统一管理本地曲库、网易云、B 站、抖音短视频与音频、智能搜索、多任务下载、播放队列、逐字歌词与自适应 HLS 流式播放。
- **浏览器安全输出**：浏览器是实际音视频渲染端，服务端负责元数据解析、下载管道、持久命令租约和播放回执。
- **点歌抢占保护**：最新点歌优先（Latest-Wins），新请求立即淘汰旧播放意图，防止滞后下载完成后抢夺当前播放权。
- **全渠道通知路由**：任务状态与异常提醒先落盘持久化，再按优先级精准投递至浏览器通知、网页动效宠物、桌面 Electron 宠物或飞书应用。
- **互动桌面宠物**：提供拟人化灵动陪伴状态与脱敏任务摘要提示；服务离线期间的通知会在重连后自动拉取补发。


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
ccm maintenance cleanup           预览可安全清理的旧日志和测试产物
ccm maintenance cleanup --apply   执行上述安全清理
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
~/.ccm/
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

卸载程序不会主动删除 `~/.ccm`：

```bash
ccm stop
npm uninstall -g @mumulinya167/cc-web
```

需要完全清除数据时，请在确认备份后单独处理 `.ccm`。不要在服务运行时直接删除该目录。

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
- 完整业务流程：<https://github.com/mumulinya/ccm-workbench/tree/main/docs/confirmed-business-processes>
- 已确认架构：<https://github.com/mumulinya/ccm-workbench/tree/main/docs/confirmed-project-architecture>

## License

MIT

---

<a id="english"></a>

## English

CCM Workbench is a local-first multi-agent development and workspace management platform. It combines global, group, and project main agents with controlled project development agents, TestAgent, persistent tasks, context and memory, MCP/Skills, knowledge retrieval, Git, terminals, Feishu/Lark, and task replay.

It is designed as a recoverable delivery workflow rather than a single chat page: requests are analyzed against the actual workspace, clarified and planned when necessary, delegated to project development agents, independently verified, and accepted only after Terminal Gate passes.

### Quick start

Node.js 20 or newer is required.

```bash
npm install -g @mumulinya167/cc-web@latest
ccm start --background --open
```

Open <http://localhost:3080>. By default CCM listens only on `127.0.0.1`.

```bash
ccm status
ccm doctor
ccm logs --follow
```

### Package and source repositories

This npm package contains the production runtime and frontend assets. The complete TypeScript/Vue source, tests, and engineering documentation are maintained in the source repository: <https://github.com/mumulinya/ccm-workbench>.

- Package repository: <https://github.com/mumulinya/ccm-web>
- npm package: <https://www.npmjs.com/package/@mumulinya167/cc-web>
- `ccm start` runs the installed package's `dist/server.js`; source changes require `npm run build` before starting a local build.

### Main capabilities

- Global, group, and project main agents share the same conversation, planning, execution, and recovery model.
- Claude Code, Codex, Cursor, Gemini/Antigravity, OpenCode, and Qoder can act as controlled project development agents.
- Formal development tasks continue in the background, survive browser closure and service restarts, and can pause at safe checkpoints before resuming in place.
- Business clarification and detailed plan confirmation happen before code work when choices affect scope, permissions, data compatibility, or acceptance.
- Real provider streaming, safe tool summaries, build/test progress, project-agent activity, and verification milestones keep users informed without exposing hidden reasoning.
- TestAgent or main-agent self-verification produces evidence before Terminal Gate accepts a delivery.
- Task replay preserves plans, assignments, attempts, evidence, interruptions, recoveries, and accepted results.
- Read, Glob, Grep, symbols, Git, build, test, terminal, PDF, image, Office, and notebook ingestion operate within project and permission boundaries.
- Feishu/Lark global and project sessions support messages, images, files, persistent queues, progress feedback, and final replies.

### Workflow

```text
Message / requirement document / image / attachment
→ exact conversation queue
→ main-agent read-only analysis
→ optional business clarification
→ detailed plan confirmation
→ persistent development task
→ controlled project development agents
→ build, test, and independent verification
→ Terminal Gate
→ final answer, file changes, execution record, and task replay
```

Ordinary questions, status checks, and read-only code analysis remain normal conversation turns. A formal task is created only when the request explicitly requires code, configuration, dependency, test, or build-script changes. Main agents do not receive unrestricted write or shell access; source changes are delegated to controlled project development agents.

### Version 3.0.4 highlights

- Cross-Platform Music & Video Multimodal Workbench: Deep integration of Douyin MCP bridge (`douyin-mcp`) enabling short-video/audio exploration (`DouyinExplorer`), metadata resolution, high-concurrency download management, adaptive HLS publication, NetEase MV synchronization, and real-time comment overlay.
- Global Agent Tool Load Policy & Security Boundaries: Fine-grained on-demand intent routing and tool lazy-loading policies (`global-tool-load-policy`), maintaining high responsiveness with strict authorization barriers for sensitive operational tools.
- Workbench UI Shell & Unified Session Navigation: Cohesive session sidebar and stage layouts across GroupChat and ProjectManager (`GroupChatSessionSidebar`, `ProjectSessionSidebar`, `WorkspacePageShell`), providing smooth collapsible navigation and dark-mode atmosphere aesthetics.
- OpenAI Responses WebSocket Transport & Fallback: Comprehensive support for OpenAI Responses API WebSocket protocol (`wss://.../v1/responses`), enabling low-latency bidirectional streaming with automatic handshake probing and transparent HTTP fallback.
- Final Context Projection Micro-Compact & Proportional Convergence: Seamless integration of tool result micro-compacting (`microCompactToolResults`) with dynamic token budget proportional convergence, strictly adhering to context boundaries while preserving protocol integrity.
- Provider Cache Persistent Idle Identity & Real Workload Loop: Long-duration idle resilience (>6h) preserving session context identity without cold-start cache eviction, complemented by real-world workload benchmark and tuning loop suites.
- Frontend SSE Tail Recovery & Conversation Ledger Reconciliation: Automated multi-pass reconciliation (`reconcileProjectConversationReply`) resolving truncated proxy streams and repairing transient failure states from authoritative persisted logs.
- Final Context Projection & Streamlined Delivery: Employs final context projection (`final-context-projection`) to strip transient intermediate states, preamble thinking, and internal tool scaffolding events when finalizing answers, ensuring clean and deterministic delivery transcripts.
- Workspace Model Result Projection: Adaptive model-facing result projection (`workspace-model-result-projection`) that summarizes and extracts structured references from oversized tool outputs, preventing context window exhaustion.
- Provider Cache Scope Metrics & Paired Comparison: Comprehensive scope-level cache efficiency tracking and paired comparison test suite (`provider-cache-scope-metrics`, `provider-cache-paired-comparison`) to benchmark token savings and latency improvements across OpenAI, Claude, and Gemini protocols.
- Search-First Workspace Observation Budget & Continuation Cursors: Enforces search-first observation paradigms (`glob_files`, `grep_text`, `list_directory`), with adaptive soft token budgets (~12K for single file, ~4K for searches, ~32K per turn) and structured `next_cursor` continuation previews preventing context bloat.
- CLI Maintenance Cleanup & System Reliability: Introduces `ccm maintenance cleanup` command and interactive CleanupCenter for one-click safe purging of stale temporary directories, orphaned worktrees, and expired todos.
- Main Agent Live-Final Presentation Lifecycle V1: Strict lifecycle contract ensuring transient preambles auto-dismiss upon reply/tool generation, and streaming answers collapse into a clean "Final Answer → Delivered → File Changes → Processed" structure.
- Live Provider Protocol Cache Matrix: Dynamic multi-protocol capability matrix and prompt cache probing across OpenAI, Claude, and Gemini formats with native microcompact fallback.
- Main Agent Five-Layer Context & Real Chain E2E: Five-tier structured agent context model with end-to-end development execution chain verification and post-review spot check closures.
- Risk-Tiered Acceptance & Execution Reconciliation: Built-in risk-tiered acceptance criteria, fine-grained impact evaluation, and automatic conversation execution ledger reconciliation.
- Feishu Global Channel & Slash Command Standardization: Unified Feishu global assistant message channels, streamlined Slash command conversation dispatch, and cohesive cross-platform UX.
- Unified Session Compaction Engine & Provider Microcompact: Core compaction scheduling architecture with provider-neutral prompt caching, microcompaction lifecycle management, and real-time microcompact status tracking.
- Canonical Context Accounting & Fine-Grained Token Breakdown: Authoritative context accounting standard segmenting system prompts, knowledge base, tool buckets, and turn history for zero-drift token usage reporting.
- Native Model Call Lifecycle & Native Query Loop: Comprehensive lifecycle event dispatching for native model calls, unified real-time streaming, and transient assistant activity projection.
- Structured Business Plan Dispatch & Code Changes Workbench: Governed source inquiry routing, structured plan presentation with one-click decision execution, and enhanced code changes workbench with unified diff review.
- Conversation Turn Controls & Multi-Scope Instructions: Granular turn-level execution controls, multi-scope instruction buttons, orphan workspace cleanup dialog, and delegated inquiry audit panels.
- Rolling Session Memory & Dynamic Token Basis: Adaptive context budget management with rolling session memory, multi-stage compaction runs, partial compaction dialogs, and start-hook context propagation.
- Live Execution Activity & Multi-Layer Trace Replay: Real-time execution projection, conversation file change cards, and enhanced multi-layer Trace Replay with seamless checkpoint resumption.
- SSE Heartbeat & Resilient Task Ledger: Integrated SSE keep-alive heartbeats and SQLite strong consistency task ledger to guarantee uninterrupted long streaming turns and zero-loss crash recovery.
- Core Packaging & Runtime Integrity Gate: Hardened release packaging gates with mandatory core module existence assertions and full-lifecycle install/start/stop verification.
- Global Agent Memory & Vector Semantic Search: Integrated vector embedding search and automatic expired memory pruning in Global Memory Manager, with session execution ledger context persistence.
- Role Skills & Refined Plan Authoring Mode: Explicitly separated plan authoring and task decomposition role skills for main agents and subagents, dynamically loading specialized skills per execution phase.
- Context Tool Buckets & Accurate Token Accounting: Fine-grained segmentation of user MCP tools and internal runtime tools in the context engine for precise token budgeting.
- Enhanced Global & Group Memory Management: Topic indexing, memory ledger, transaction isolation, distilled memory, dynamic memory window, and boundary journal with reactive compaction recovery.
- Advanced Agent Execution UX: Inline agent code diff rendering, nested child agent conversations, presented requirement plan cards with one-click confirmation, pre-plan clarification cards, conversation todo tracking, and collapsible read/search step headers.
- Context Engine & Multi-Provider Prompt Cache: Provider-neutral prompt caching and microcompaction lifecycle management to optimize token usage in long conversations.
- Real streaming and explainable progress are consistent across global, group, and project conversations.
- Tool details are organized into a concise summary, user-readable results, and permission-aware technical details.
- Safe pause/resume, semantic message routing, pre-plan clarification, Feishu attachment ingestion, conversation runtime status, and away summaries reuse the existing task ledger.
- Only the current generation accepted by Terminal Gate is displayed as a completed delivery.
- Workspace reads support checksum-bound continuation, current-context deduplication, safe path suggestions, bundled ripgrep, cancellation, timeout, and partial-result recovery.

### Models, providers, and runtimes

CCM supports OpenAI-compatible, Claude-compatible, and Gemini-compatible provider configurations. Token, cache, and cost figures are shown only when the provider reports them. Missing usage is displayed as unavailable instead of being estimated as zero.

Third-party development runtimes require their own official installation and authentication. CCM does not bypass provider, organization, CLI, repository, operating-system, or network permissions.

### Common CLI

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

For a trusted LAN, explicitly bind a network interface:

```bash
ccm start --background --host 0.0.0.0 --port 3080
```

For public access, keep CCM on `127.0.0.1` and use an HTTPS reverse proxy or secure tunnel.

### Local data and security

CCM stores runtime data under `~/.ccm`, outside the npm installation directory. This includes configuration, sessions, tasks, controlled uploads, logs, caches, and service lifecycle state. Existing `~/.cc-connect` data remains preserved as read-only compatibility data after migration.

Conversation and resource permissions, CSRF/Host protections, signed internal calls, project path boundaries, sensitive-file filtering, worktree isolation, and explicit high-risk approval remain authoritative. Normal messages, execution records, task replay, search indexes, and browser storage do not expose prompts, secrets, raw stdout, hidden reasoning, source bodies, or native third-party session identifiers.

Uninstalling the npm package does not delete user data. Stop CCM and back up `~/.ccm` before removing it manually.

### Support

- [GitHub repository](https://github.com/mumulinya/ccm-web)
- [Source repository](https://github.com/mumulinya/ccm-workbench)
- [Documentation](https://github.com/mumulinya/ccm-workbench/tree/main/docs)
- [npm package](https://www.npmjs.com/package/@mumulinya167/cc-web)
- [Issue tracker](https://github.com/mumulinya/ccm-web/issues)

When reporting an issue, include the CCM version, operating system, Node.js version, reproduction steps, and sanitized errors. Do not publish API keys, cookies, OAuth codes, full prompts, private source code, or raw internal logs.

### License

MIT
