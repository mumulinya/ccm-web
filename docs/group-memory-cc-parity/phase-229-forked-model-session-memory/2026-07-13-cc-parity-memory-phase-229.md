# Phase 229：Forked Model Session Memory 与事实引用证据

日期：2026-07-13

## 目标

把群聊 Session Memory 从“确定性结构化摘要”升级为 Claude Code 风格的独立模型提炼：达到阈值后由后台隔离 Agent 读取当前 notes 与新增原始消息，只有模型输出验证、租约 fencing 和原子提交全部成功后才推进 token/message 游标。同时让 Memory Center 和项目子 Agent 能复验模型来源、失败退避及具体章节使用证据。

## Claude Code 对照

参考源码：

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`
- `D:\claude-code\src\services\SessionMemory\prompts.ts`

继续保持以下 CC 语义：

- 初始化阈值 10000 tokens。
- 更新增量 5000 tokens。
- 忙碌轮次累计 3 次 tool call，或自然停顿时更新。
- 当前 notes 与上次成功游标后的原始 conversation 一起交给独立 Agent。
- 只有独立 Agent 成功完成 Session Memory 更新后才推进游标。
- 每章节 2000 tokens，整份 Session Memory 12000 tokens。
- raw transcript 永远保留为权威来源。

## 实现

### 1. 真正的后台模型提炼

新增 `group-session-memory-model-extraction.ts`：

- assistant post-sampling append hook 按 `groupId::gcs_*` 调度提炼。
- 每个群聊会话独立 debounce、running、pending 和 retry 状态。
- 只读取所属会话的当前 `summary.md` 与上次成功游标之后的消息。
- 使用 CC 的十个固定章节、固定顺序和逐字 description 模板。
- transcript 和 current notes 都按不可信数据处理，禁止其中指令改变模板、调用工具、编辑文件或派发任务。
- 模型输出必须只形成合法 Session Memory，额外 heading、空内容或错误模板均拒绝。
- 输入审计记录 prompt、current notes、source transcript checksum 和消息首尾 ID。

生产 executor 使用群聊 coordinator 或可路由成员的真实第三方 Agent 配置，在 `session-memory-extractor-sandbox/<scope>` 隔离目录后台执行。它不更新可见 Agent 活动，不做项目独立验证，不允许工具，并检查 sandbox 不得产生代码修改。

### 2. 成功后才推进游标

`saveGroupMemory()` 遇到 cadence due 时不再同步生成确定性摘要冒充成功，而是持久化：

- `status = model_extraction_due`
- `modelExtractionRequired = true`
- `modelExtractionQueuedAt`

此时 `tokensAtLastExtraction`、`lastExtractionMessageId`、`extractionCount` 均不推进。只有模型输出通过模板/预算验证，并取得当前 lease/fencing 后，才原子写入 `summary.md`、`snapshot.json` 和成功回执。

手工保存和低阈值会话仍允许确定性结构化 bootstrap，明确标记：

- `extractionMethod = deterministic_structured_fallback`
- `modelExtracted = false`
- `deterministicFallback = true`

它不是一次成功的模型提炼，也不能推进 CC cadence 游标。

### 3. 异步租约、超时和退避

异步 extraction transaction 支持：

- lease TTL 三分之一周期自动续租。
- staged commit 前后验证 `leaseId + fencingToken + owner`。
- 130 秒默认模型执行超时；生产 runner 自身使用 120 秒超时。
- 失败分类：`timeout`、`invalid_model_output`、`lease_lost`、`model_execution_failed`。
- 30 秒起步的指数退避，最大 30 分钟。
- 连续失败次数、`retryBackoffMs` 和 `nextRetryAt` 持久化。
- 成功后重置连续失败和退避。

错误模板、超时或失去租约都不能覆盖最近成功 Session Memory，也不能推进游标。

### 4. 成功/失败证据分离

成功回执保存为 `model-extraction-receipt.json`，绑定：

- group/session/scope
- execution、extractor project/agent/model/native session
- prompt/current notes/transcript checksum
- source message range
- output/markdown/budget checksum
- lease/fencing
- cursor before/after
- section evidence checksum

失败回执独立保存为 `model-extraction-failure-receipt.json`，不会覆盖最近成功证明。它记录 failure class、错误、重试时间、输入来源和被保留的旧 snapshot checksum。

Memory Center 只有在 `status=committed`、receipt checksum、scope、markdown checksum 和 section evidence checksum 全部匹配时，才把模型回执标记为 verified。

### 5. Session Memory 章节证据

每个 snapshot 新增 `sectionEvidence`：

- 每章节稳定 `evidenceId`
- section 名称和索引
- `sectionChecksum`
- `sourceTranscriptChecksum`
- source first/last message ID 与消息数量
- 整体 evidence checksum

模型回执与 snapshot 都绑定同一个 section evidence checksum。确定性 bootstrap 也生成章节 checksum，但来源类型明确为 `deterministic_memory_snapshot`，不会伪装成模型 transcript 证据。

### 6. 项目子 Agent 事实引用门禁

任务级 memory snapshot 将所属 Session Memory 的章节证据一起绑定到第三方 Agent 会话。worker receipt 新增必填 `memoryFactCitations`：

- `evidenceId`
- `section`
- `sectionChecksum`
- `sourceTranscriptChecksum`
- 本章节如何影响本轮判断、修改或验证

当 `memoryContextUsage.usageState` 为 `used` 或 `verified` 且存在章节证据时，至少需要一条真实引用；所有字段必须与系统送达 snapshot 一致。`ignored` 时引用必须为空。

验收 schema 升级为 `ccm-task-agent-memory-context-consumption-validation-v3`。伪造 evidence ID、章节、section checksum 或 transcript checksum 都会 fail closed，并阻止任务验收。

### 7. Memory Center

Session Memory Fleet 新增：

- model extracted / verified
- model pending / backoff
- invalid receipt
- extraction method
- 成功与失败回执校验状态
- prompt/source transcript checksum
- failure class、连续失败、退避和下次重试时间

Fleet 继续按每个 `groupId::gcs_*` 独立审计，不扫描或创建 legacy `default`。

## Agent 边界

- 群聊主 Agent 只使用当前 `groupId::gcs_*` 的 Session Memory。
- 项目子 Agent 每次新会话取得所属群聊会话的 snapshot、系统送达回执和章节证据。
- Global Agent 继续只使用全局记忆、群聊路由目录和任务状态，不注入群聊 Session Memory 正文。
- 不迁移或保留 legacy `default` 会话。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npm run build`：前端、MCP Feishu、后端全部通过。
- Phase 229 forked model extraction：12/12。
- Phase 226 cadence：17/17。
- Phase 227 extraction transaction：11/11。
- Phase 228 delivery/fencing：13/13，12 进程并发完整。
- Phase 225 budget/fleet：12/12。
- Memory Center session scope：5/5。
- boundary journal：14/14。
- resume integration：7/7。
- model capability cache/recovery/refresh race：全部通过。
- Task Agent memory fact citation：8/8。

专项覆盖：

- cadence due 只排队，不提前推进游标。
- 合法 CC 十章节模型输出原子提交。
- 模型回执绑定 prompt/transcript/lease/fence/cursor。
- 章节证据稳定并与回执 checksum 一致。
- 错误模板保留上次成功摘要和游标。
- 成功与失败回执分文件保存。
- 失败进入持久指数退避，重试成功后复位。
- 超时模型不能晚提交或替换成功摘要。
- 同群聊 A/B 会话互不影响。
- 伪造项目子 Agent fact citation 阻止验收。
- legacy `default` 提炼请求被拒绝。

## 界面验收

- 桌面端 `1280px`：11 张 Session Memory Fleet 指标卡、3 条真实会话行正常显示。
- 移动端 `390 x 844`：指标两列排列，行内容自动换行。
- 桌面与移动端 `documentScrollWidth = viewportWidth`。
- 行与卡片均 `scrollWidth = clientWidth`，无横向溢出。
- 浏览器控制台 0 warning、0 error。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`25344`
- `sessionCount = 3`
- `groupCount = 3`
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`
- `maxObservedSessionTokens = 230`
- `modelExtractionPendingCount = 0`
- `task-agent-sessions.json.lock`：无残留。

三个真实群聊会话都低于 CC 的 10000-token 初始化阈值，因此当前 `modelExtractedSessionCount = 0` 属于正常状态。达到阈值后才会调用真实后台 Agent，不会把 3M 或任意固定字符量当作压缩目标。

## 后续方向

长期目标保持 active。下一阶段继续对照 Claude Code，优先审计模型提炼的增量事实合并质量、冲突/纠正的逐事实 provenance、模型 executor 冷启动可用性，以及 Memory Center 对历史 extraction attempt 的时间线，而不是只保留 latest success/latest failure。
