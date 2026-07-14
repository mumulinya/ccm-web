# Phase 232：Session Memory 事实级替代图与纠正来源

日期：2026-07-13

## 目标

继续将 CCM 的群聊会话记忆推进到 Claude Code 的可靠性方向。本阶段解决一个明确风险：旧实现只要在增量 transcript 中发现一次“更正 / 改为 / no longer”等宽泛信号，就可能允许任意旧约束从 Session Memory 中消失。

目标是把“纠正允许删除”升级为逐事实证明：每个被删除的旧事实必须绑定具体新消息、替代文本、旧/新事实 checksum 和来源消息 checksum。没有精确替代边的硬约束丢失必须拒绝提交。

用户边界继续保持：只接受 `groupId::gcs_*`；旧 `default` 会话不迁移；项目子 Agent 只接收所属群聊会话的 active facts；Global Agent 不接收群聊 transcript、Session Memory 正文或事实替代内容。

## Claude Code 对照

本阶段重新审计：

- `D:\claude-code\src\services\SessionMemory\prompts.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\compact\sessionMemoryCompact.ts`
- `D:\claude-code\src\services\compact\postCompactCleanup.ts`

确认的基线：

- Session Memory 是主线程 post-sampling hook，forked extraction Agent 使用隔离上下文更新精确记忆文件。
- 初始化阈值 10000 tokens，更新间隔 5000 tokens，工具阈值 3 次；token 阈值始终必须满足。
- 更新失败不推进 `lastSummarizedMessageId`；成功且最后 assistant turn 没有 tool calls 才推进。
- Session Memory Compact 直接使用已有 Session Memory，不再做一次摘要模型调用。
- 每节约 2000 tokens、总计约 12000 tokens；超预算时压缩旧细节，优先保留 Current State、Errors & Corrections、未完成任务和精确约束。
- compact 后恢复 CLAUDE.md、plan、skills 和 Agent 状态时必须按 Agent/thread 隔离，不能由子 Agent compact 清掉主线程状态。

CC 的 prompt 明确要求只有新证据显式 supersede 才能删除旧约束。CCM 本阶段将这个语义从提示词要求升级为可复算的运行时门禁。

## 实现

### 1. 合并质量 v2

`backend/modules/collaboration/group-session-memory-model-extraction.ts` 的 merge quality 升级为 `ccm-group-session-memory-model-merge-quality-v2`。

- 从旧 Session Memory 提取 constraint、unresolved、symbol 和 path anchors。
- 每个 anchor 分类为 `retained`、`superseded` 或 `unjustified_lost`。
- `correctionSignal` 只保留为诊断字段，不再能全局豁免 anchor/constraint 丢失。
- `lostConstraintCount > 0` 直接拒绝提交。
- 大范围 anchor 丢失按 retained + explicitly superseded 的 justified 比例判定。
- 内部下划线不再从代码符号中删除，`PHASE232_OLD_CONSTRAINT` 等标识可原样进入 provenance。

### 2. 事实替代图

新增 `ccm-group-session-memory-fact-supersession-graph-v1`：

- fact：`factId`、type、原文、`factChecksum`、状态和 edge 绑定。
- edge：旧 fact ID/checksum、新 fact checksum、精确 `sourceMessageId`、来源消息 checksum、替代文本和关系类型。
- active facts：仍保留的事实与明确替代后的新事实。
- 聚合：retained、superseded、unjustified lost 和 active 计数。
- 整图带 64 位 SHA-256 checksum；校验同时复算图、replacement checksum、source message checksum 和 fact/edge 双向绑定。

替代边只有在以下条件全部满足时生成：

1. 新消息具有稳定 message ID。
2. 消息包含明确纠正语义。
3. 消息引用该旧事实的唯一符号、路径或文本 token。
4. `改为 / 替换为 / instead / replace with` 后存在替代文本。
5. 替代文本确实出现在模型生成的新 Session Memory 中。

### 3. 持久化与精确重放

图和 checksum 写入：

- committed extraction receipt
- Session Memory snapshot
- result gzip artifact
- committed history event 的图 checksum 和计数

`replayGroupSessionMemoryModelExtraction()` 会从 request/result artifact 重新生成图，并验证：

- 图结构和 checksum 有效。
- replay 图 checksum 与 terminal history 一致。
- replay 图 checksum 与签名 receipt 一致。

公开 replay API 仍只返回布尔 checks、checksum、压缩大小和预算摘要，不返回事实正文、来源消息、raw output、事件对象或绝对路径。

### 4. 子 Agent active-fact 投影

完整图只作为 Session Memory 审计历史持久化。`buildAgentMemoryContextBundle()` 会生成独立的 `ccm-group-session-memory-active-fact-projection-v1`：

- 从结构化 child context 中移除 receipt/merge quality 内的完整审计图，避免把 superseded 旧事实重新注入。
- 只保留 active fact ID、checksum、类型、文本和新来源 message ID。
- rendered context 明确声明子 Agent 只能使用 active facts，不得恢复 superseded 事实。
- 派发前再次独立复算图和 edge 绑定；磁盘图被篡改时 `graphValid=false`、active facts 清空，fail closed。

另一群聊会话不会获得该图或替代事实。Global Agent 的全局上下文也不含群聊旧/新事实正文。

### 5. Memory Center

Memory Center fleet 新增：

- `supersession`：替代边总数和已观察图数量。
- `unjustified loss`：未解释丢失总数和无效图数量。
- 会话行显示图 `verified / invalid / unobserved`、edge 数和 unjustified lost 数。
- replay 面板新增“事实替代图有效”和“事实替代图可复算”检查。
- 图 checksum、edge 或 markdown 绑定失败会把该会话标记为 fail 并给出 gap。

## 自测

新增 `scripts/group-session-memory-fact-supersession-selftest.mjs`，13/13：

- 无关纠正不能豁免旧硬约束丢失。
- 精确引用旧约束且替代内容进入新记忆时生成唯一 edge。
- edge 绑定旧/新 checksum 和具体 source message ID。
- 正常图通过校验，篡改 replacement 后 fail closed。
- 两次真实 extraction 后图持久化到 snapshot 和 receipt。
- history + request/result artifact 可精确重放图。
- Memory Center 正确报告图、edge 和未解释丢失。
- 子 Agent 只看到新 active replacement，不看到旧事实或完整审计图。
- 直接篡改磁盘图后，派发时 active facts 清空且篡改文本不进入 prompt。
- 同群聊另一会话看不到替代事实。
- Global Agent 看不到旧/新群聊事实正文。
- `default` scope 始终不存在。

Phase 230 的旧测试已改为验证 broad correction 被拒绝，9/9 通过。

## 回归

- Phase 232 fact supersession：13/13。
- Phase 231 extraction chain/replay：12/12。
- Phase 230 cold recovery/history：9/9。
- model extraction：12/12。
- update cadence：17/17。
- extraction transaction：11/11。
- delivery/fencing：13 项全部通过，12 进程并发通过。
- budget/fleet：12/12。
- boundary journal：14/14。
- resume integration：7/7。
- Memory Center session scope：5/5。
- `npm run check`：通过。
- `npm run build`：frontend、MCP Feishu、backend 全部通过。

## 界面验收

- 桌面 `1280 x 720`：Memory Center 新增 supersession / unjustified loss 卡片；document `scrollWidth=clientWidth=1280`；fleet 内无越界元素。
- 手机 `390 x 844`：document `scrollWidth=clientWidth=390`；fleet 面板宽 347.2px，内部无越界元素；页面既有 scope tabs 保持横向滚动容器。
- 浏览器控制台：0 error / 0 warning。
- 截图确认桌面布局无重叠；手机完整页面和 fleet 几何检查通过。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`28244`
- 命令：`"D:\nodejs\node.exe" ccm-package/dist/server.js 3081`
- 群聊：3 个。
- 每个群聊：1 个全新、空的 active `gcs_*` 会话，messageCount=0。
- 旧会话和 `default`：0。
- fleet：`empty`，符合 10000-token 初始化阈值语义。
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`
- `modelExtractionHistoryInvalidCount = 0`
- `modelExtractionHistoryChainInvalidCount = 0`
- `modelExtractionReplayInvalidCount = 0`
- `factSupersessionGraphInvalidCount = 0`
- `factSupersessionUnjustifiedLostCount = 0`
- Phase 232 测试会话、消息、snapshot、history、gzip artifact 和空目录残留：0。

## 后续方向

长期目标保持 active。下一阶段优先实现：

1. extraction history / gzip artifact 的保留、归档和容量策略。
2. 跨 replay schema 版本迁移与旧制品兼容校验。
3. 将事实替代图 checksum 和 replay 状态绑定到子 Agent memory usage receipt、delivery receipt 与故障恢复门禁。
4. 对自然语言低唯一度事实增加更强的语义引用评分，继续降低错误 supersession 的可能性。
