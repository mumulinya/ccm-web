# CCM Memory CC Parity Phase 241

## 阶段目标

补齐 Claude Code 的 recall-side freshness 机制。记忆即使通过准入和召回评分，也只是写入时的事实快照；第三方子 Agent 在据此推荐、修改或让用户采取行动前，必须看到明确年龄、核验当前状态，并通过结构化回执证明实际如何使用。

- 每条 recalled MEMORY.md 都携带可机器验证的新鲜度元数据。
- 超过 1 天的记忆获得单条显式陈旧警告，今天和昨天的记忆不产生噪声警告。
- “如何信任记忆”作为独立高显著度 WorkerContextPacket 契约，位于记忆正文之前。
- `typedMemoryUsage` 正式进入通用子 Agent 回执 schema。
- 当前文件证明继续由平台读取并重新计算 SHA-256，不能相信 Agent 自报。
- 作用域继续严格绑定 `groupId::gcs_*`；Global Agent 不接收群聊会话正文。

## Claude Code 对照结论

Claude Code 有两层互补机制。

第一层位于 `D:\claude-code\src\memdir\memoryAge.ts:1-53`：

- 使用文件 mtime 计算 floor-rounded age days。
- today 和 yesterday 不显示陈旧警告。
- 超过 1 天时，不只显示 ISO 时间，而是直接写成 `This memory is N days old`。
- 警告明确说明记忆是 point-in-time observation，代码行为和 file:line 可能已经失效，断言前必须检查当前代码。

第二层位于 `D:\claude-code\src\memdir\memoryTypes.ts:224-256`：`## Before recommending from memory` 被设计为独立 section。源码中的评估记录表明，同一规则埋在 “When to access” 普通 bullet 中效果明显变差；位置和标题会影响模型是否真的执行核验。

其核心规则包括：

- 记忆里的文件、函数和 flag 只证明它们在写入时存在。
- 推荐文件路径前检查文件存在。
- 推荐函数或 flag 前 grep 当前源码。
- 用户将据此行动时必须先核验。
- 当前仓库状态优先于历史快照。

Phase 240 已实现冲突后的撤回/替代，但 Phase 241 之前 CCM 只有正文末尾的通用“使用前核验”一句话，既没有 per-memory 人类可读年龄，也没有位于记忆正文之前的独立决策触发 section。

## 实现内容

### 1. 单条召回新鲜度

`buildGroupTypedMemoryRecall` 为每个 recalled doc 生成 `ccm-group-typed-memory-recall-freshness-v1`：

- observed mtime 和 ISO 时间。
- evaluated time。
- `age_days` 和 `age_label`。
- `stale_after_days=1`。
- `stale`。
- `current_source_verification_required=true`。
- 陈旧时的自然语言 warning。

年龄计算与 Claude Code 相同：`floor((now - mtime) / 86400000)`，未来时间和时钟偏移按 0 天处理。测试可以传入 `nowMs`，因此阈值行为是确定性的。

召回结果同时生成 `ccm-group-typed-memory-recall-freshness-summary-v1`，包含 recalled/fresh/stale 数量、陈旧 relPath、评估时间和 metadata checksum。

### 2. 人类可读警告

类型化召回渲染现在显示总陈旧数，并为每条超过 1 天的记忆单独输出：

`This memory is N days old. Memories are point-in-time observations, not live state...`

新鲜记忆只显示 `saved today` 或 `saved yesterday`，不增加长警告。陈旧 warning 位于对应 MEMORY.md 条目前，第三方 Agent 不需要根据 ISO 日期自行做日期运算。

### 3. 高显著度 Worker 信任契约

`buildWorkerContextPacket` 从所属群聊会话的 `typed_memory_recall` 构造 `ccm-worker-memory-recall-trust-contract-v1`。契约只保存 relPath、文档 checksum、年龄、stale 状态和核验要求，不复制记忆正文。

契约包含：

- exact `groupId--gcs_*` scope。
- recalled/fresh/stale 数量。
- required 和 stale relPath。
- `verification_required_before_recommendation=true`。
- `current_source_wins_on_conflict=true`。
- `stale_memory_must_be_updated_or_removed=true`。
- 确定性 contract checksum。

渲染时 `## Before recommending from memory` 位于 `平台记忆` 正文之前。它要求检查文件存在、搜索函数和 flag、在用户行动前核验，并在冲突时相信当前状态并上报更新、替代或删除旧记忆。

### 4. 上下文预算与压缩保持

信任契约是独立的 `memory_recall_trust_contract` 上下文预算类别，并标记 required。其 token 消耗进入 WorkerContextPacket 的模型容量计算。

memory-first compact 只压缩记忆正文和召回条目数量，不移除 freshness metadata 或 trust contract。相同 recall 在压缩前后保持相同 contract checksum 和 stale count。

### 5. 子 Agent 回执闭环

通用 self-contained worker 回执 schema 新增必填 `typedMemoryUsage`：

```json
{
  "typedMemoryUsage": [{
    "relPath": "surfaced MEMORY.md relPath",
    "usageState": "used | verified | ignored",
    "currentSourceVerified": false,
    "currentSourceEvidence": {
      "evidenceType": "file_read",
      "sourcePath": "项目内当前文件",
      "sourceChecksum": "完整 SHA-256"
    },
    "reason": "采用、核验或忽略原因"
  }]
}
```

WorkerContextPacket acceptance 同步声明：

- `typed_memory_usage_receipt_required`。
- `typed_memory_current_source_verification_required`。
- `typed_memory_stale_recall_present`。
- `typed_memory_required_rel_paths`。

已有服务端消费链继续逐条匹配 relPath。Agent 声明 verified 时，平台解析项目真实路径、防止项目外和 symlink 逃逸、读取当前文件并复算完整 SHA-256；没有有效证明的 verified 会降级为 used 并记录异常。

### 6. 消费账本年龄证据

任务侧 typed-memory recall doc 现在继续携带：

- exact group session id。
- memory age days/label。
- stale 状态。
- freshness summary checksum。
- current-source verification requirement。

后续消费反馈可以区分“新鲜记忆被采用”和“陈旧记忆在当前会话重新核验后被采用”，而不是只看 usageState。

## 会话和 Global 边界

Phase 241 自测创建 Session A 和 Session B：

- Session A 的陈旧与新鲜 MEMORY.md 只进入 Session A trust contract。
- Session B recall 为 0，不包含 Session A relPath 或正文。
- ignore-memory 时 recall 为空、trust contract 为 null、acceptance 不要求 typed usage，渲染不提历史 relPath。
- Global Agent 的实际 `buildAgenticContext` 保持 `group_session_context_included=false`，只接收群聊路由元数据，不包含 Session A/B 记忆正文。

显式 `/api/global-agent/group-memory` 技术查询端点仍可供人工诊断多群聊记忆，但它不是 Global Agent 模型提示词输入。

Global Agent 召回指标新增默认开启的 `recordMetric` 开关。生产调用保持记录；隔离自测和只读诊断可以显式设为 false，避免测试 session 污染真实 recall hit/miss 指标。本阶段清理了两条早期 Phase 241 测试 `recall_miss`，同步回退 `recallAttempts`，再次运行自测后外部指标残留为 0。

## 验证结果

- `npm run check`：通过。
- 后端 TypeScript 构建：通过。
- Phase 241 recall freshness/trust contract：14/14。
- 新鲜度结果：recalled 2、stale 1、fresh 1。
- 单条 5-day warning、today 无噪声、summary checksum：通过。
- trust section 位于记忆正文之前：通过。
- trust contract 不包含记忆正文：通过。
- memory-first compact 保持 contract checksum：通过。
- self-contained worker 回执逐 relPath 证明模板：通过。
- Session B 隔离、ignore-memory、Global Agent 正文隔离：通过。
- 语义召回：20/20，包含 session isolation、global boundary、ignore memory。
- 消费反馈：18/18。
- 当前源证明：20/20。
- 正向记忆生命周期：19/19。
- Memory Center 会话隔离：13/13。
- 类型化上下文：24/24。
- 类型化索引基础回归：9/9。
- Worker runtime kernel 与 context usage 回归：通过。
- 生产完整质量评估：160 项，73.8/warn，11 ok、145 empty、4 项既有失败，无新增失败，耗时 31.1 秒。
- `git diff --check`：通过。
- Phase 241 群聊会话、typed-memory、全局指标运行时测试残留：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`11712`
- HTTP `/api/groups`：200。
- 服务错误日志：0 字节。
- `gmps7ha15::gcs_mriu5m33_ahy0yo`：sessions 1、archived 0、legacy/default 0。
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`：sessions 1、archived 0、legacy/default 0。
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`：sessions 1、archived 0、legacy/default 0。
- 三个裸群级 typed-memory 目录均不存在；后台诊断未重建旧目录。

## 长期目标状态

Phase 241 已完成，但 Claude Code 记忆系统对齐继续保持 active。

后续优先方向：把子 Agent 上报的“当前状态与记忆冲突”从消费异常进一步自动绑定到 Phase 240 生命周期候选，使平台可以生成待确认的 stale-memory update/remove 建议；同时继续保持群聊会话硬隔离、Global Agent 群聊正文隔离、第三方子 Agent 新会话和旧会话直接删除。
