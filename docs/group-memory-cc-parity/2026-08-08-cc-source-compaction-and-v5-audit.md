# Claude Code 源码对照与 CCM 多 Agent 记忆压缩审计

日期：2026-08-08  
CCM 根目录：`C:\Users\admin\.cc-connect\ccm`  
Claude Code 参考源码根目录：`D:\claude-code`

## 1. 结论

CCM 的正式压缩主链已经与本机可读 Claude Code 参考实现保持核心语义一致，并保留了更严格的多 Agent Boundary、Generation、Hydration、checksum、二次 Token Gate 和提交回执。此次审计发现并修复了五类可证明缺口：

1. ContextPlan checksum 没有参与第三方 Hydration lineage，计划变化可能错误继续 delta。
2. 已投递 segment/memory 允许重复返回正文，且 memory version 没有参与变化识别。
3. MCP 累计读取只对照完整自动压缩阈值，未绑定最终 payload 的剩余容量；项目路径也未计入可信 Provider usage 正偏差。
4. Bootstrap 只有最终容量门禁，没有独立 `maxBootstrapTokens` 门禁。
5. 群聊正式压缩提交前没有显式验证输入消息前缀和旧压缩身份仍未被并发改写；摘要也缺少独立 hypothesis 状态。

修复后，`npm run check`、backend build、Hydration 68 项测试和 `npm run test:memory` 的 23/23 个测试文件全部通过，测试未调用付费 Provider。

## 2. 证据边界

本机安装的官方 Claude Code 是 `D:\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe`，版本 `2.1.220`，是不可直接阅读的二进制。`D:\claude-code` 的 `package.json` 明确把自己描述为 reverse-engineered Claude Code CLI，版本 `1.0.3`。因此：

- 下文能证明的是本机逆向源码仓库中的调用链及其与 CCM 的语义关系。
- 不能把该仓库当成 Anthropic 私有官方源码，也不能证明官方 `2.1.220` 的所有内部细节完全相同。
- `reactiveCompact.ts` 在该参考仓库中是短桩，Reactive Compact 的内部算法只能从 `query.ts` 的外部控制流验证；相应结论保留为部分对齐。
- 本次没有复制 Claude Code 源码，只实现 CCM 自己的状态机与测试。

## 3. Claude Code 参考实现还原

### 3.1 自动压缩

```text
src/query.ts
  -> 过滤 compact boundary 后的消息
  -> tool result budget / snip / microcompact
  -> services/compact/autoCompact.ts: checkAutoCompact
       -> utils/tokens.ts: tokenCountWithEstimation
       -> effective context - output reserve - 13K buffer
  -> compactConversation
       -> Session Memory 候选或传统模型摘要
       -> buildPostCompactMessages
       -> 恢复 rules / files / plan / skills / tools / MCP
  -> 下一次 Provider 请求
```

关键证据：`D:\claude-code\src\query.ts:365-535`、`src\services\compact\autoCompact.ts:28-90,147-350`、`src\utils\tokens.ts:48-67,205-260`、`src\services\compact\compact.ts:389-750`。

### 3.2 手动 `/compact`

```text
src/commands/compact/index.ts
  -> src/commands/compact/compact.ts
  -> Session Memory 优先（无自定义指令）/ microcompact
  -> compactConversation（与自动压缩共享正式核心）
  -> 重建 system、user 和恢复上下文
```

关键证据：`src\commands\compact\compact.ts:40-228,250-286`。

### 3.3 Prompt Too Long / Reactive Compact

```text
src/query.ts Provider PTL
  -> withheld PTL/media error
  -> reactive compact feature branch
  -> 单次正式压缩
  -> 重建请求并重试一次
  -> 再失败则向上返回错误
```

外部控制流证据：`src\query.ts:790-825,1068-1178`。内部 `src\services\compact\reactiveCompact.ts` 在本地参考仓库中没有足够实现证据。

### 3.4 Resume / Continue

```text
src/utils/sessionStorage.ts
  -> 从 append-only JSONL 重建消息链
  -> 应用 compact boundary / snip 视图
  -> 恢复 tool use/result 对应关系
  -> src/utils/sessionRestore.ts: processResumedConversation
  -> 重新加载当前规则与运行能力
```

关键证据：`src\utils\sessionStorage.ts:1943-2207,2225+`、`src\utils\sessionRestore.ts:409+`。

### 3.5 摘要、近期窗口和工具结果

- Token 口径：最近可信 Provider usage（input、cache creation、cache read、output）加锚点后消息估算；无可信 usage 时回退估算。
- 摘要输入：旧摘要加新消息；传统路径会移除图片并重新注入附件；PTL 重试按完整 API round 丢弃最旧组。
- Session Memory 路径：按 Token 动态选择窗口并保持 tool use/result 配对，达到第二阈值时返回 null。
- MicroCompact：缓存原生命中时本地消息不改；时间策略只修改旧 tool result 的模型可见正文。
- 原始证据：JSONL 追加保存，compact 改变模型可见链而不是删除原始记录。
- 恢复：清理缓存后，从权威文件/计划/skills/tools/MCP 重新加载，不把完整定义写进摘要。

一个重要差异是：参考仓库传统 compact 的 true post-token 结果主要进入 telemetry，未看到与 CCM 相同的硬提交拒绝；CCM 的二次 gate 因而属于 `ccm_stricter_by_design`。

## 4. CCM 当前生产调用链

### 4.1 平台主 Agent 正式压缩

```text
消息 append / 手动 API / Provider PTL
  -> group-memory-context.ts: schedule/runGroupMemoryAutoCompactionNow
  -> group-compaction-engine.ts: compactGroupConversationMemory
       -> 完整模型可见 payload + usage 校准
       -> 动态近期完整轮次和工具闭包
       -> Session Memory 或模型候选摘要
       -> 质量/保真/hypothesis gate
       -> 恢复 rules / skills / MCP / task state
       -> true post-compact payload gate
       -> 最多一次正式 recompact
  -> lifecycle/activity/source-state commit fences
  -> compact head + memory + boundary journal + receipt
  -> resume projection 重建
```

生产证据：

- 自动/提交入口：`backend/modules/collaboration/group-memory-context.ts:980-1509`。
- 手动入口：`backend/modules/collaboration/group-routes.ts:2813-2851`。
- 模型请求、动态窗口和二次 gate：`backend/modules/collaboration/group-compaction-engine.ts:457-548,723-851,1016-1399`。
- Reactive group-main 恢复：`backend/modules/collaboration/group-orchestrator-routing.ts:760-805,860-1017`。
- 共享 Token 核心：`backend/system/session-compaction-core.ts:298-640`。
- Resume 校验：`backend/modules/collaboration/group-memory-context.ts:651-845`。

### 4.2 第三方项目子 Agent Hydration

```text
CCM 建立精确 parent/session/provider/generation/boundary 身份
  -> createThirdPartyMemorySnapshot
  -> final bootstrap gate（独立 maxBootstrapTokens + 最终 payload gate）
  -> 签名 ccm__knowledge_context MCP
  -> manifest
  -> 按完整 round 分页读取 required session segments
  -> 按 id/version/contentHash 读取 required memory
  -> 累计读取预算 gate
  -> acknowledge（snapshot/context plan/confirmation cursor/challenge）
  -> 允许修改任务与提交回执
```

生产证据：

- Snapshot、lineage、分页、去重与累计 gate：`backend/integrations/third-party-memory-snapshot.ts:96-535`。
- MCP 工具与确认门禁：`backend/integrations/knowledge-context-mcp.ts:58-197`。
- HMAC 签名作用域：`backend/integrations/internal-mcp-runtime.ts:90-139`。
- 项目入口最终计量：`backend/server.ts:1354-1478,1722-1747`。
- 群聊子 Agent 最终计量：`backend/modules/collaboration/collaboration-cross-agents.ts:880-1339`。
- 修改任务失败关闭：`backend/server-agent-runner.ts:1151-1167`。

## 5. Claude Code 与 CCM 对照矩阵

| 对照项 | Claude Code 参考源码证据 | CCM 生产证据 | 语义结论 | 风险 | 修改 |
|---|---|---|---|---|---|
| 自动压缩触发 | `query.ts` -> `checkAutoCompact` -> `compactConversation` | `group-memory-context.ts` -> `compactGroupConversationMemory` | aligned_semantically | Provider 封装不同 | 否 |
| 手动 `/compact` | `commands/compact/compact.ts` 复用正式核心 | `group-routes.ts:2813+` 复用 `runGroupMemoryAutoCompactionNow` | aligned_verified | 无 | 否 |
| Reactive Compact | `query.ts:1068+` 单次恢复；内部实现不足 | `group-orchestrator-routing.ts:860+` 正式 compact 后单次重试 | partially_aligned | CC 内部桩无法精确核验 | 否 |
| Token 计量口径 | usage + 新消息估算，含 cache/output | `session-compaction-core.ts:569+` + 完整 payload | aligned_semantically | Provider usage 字段不同 | 是：Hydration 余量绑定 |
| 旧工具结果处理 | cache edit / time-based microcompact | `session-model-context.ts` 可恢复替换 | aligned_semantically | Native cache 只对支持者启用 | 否 |
| 摘要输入 | 旧摘要 + boundary 后消息 + 恢复证据 | `group-compaction-engine.ts:1016+` | aligned_semantically | CCM 多 Agent 状态更多 | 否 |
| 摘要格式 | CC 以 prose/XML 指令为主 | CCM 结构化 JSON summary | partially_aligned | 结构不同，目标语义一致 | 是：hypotheses |
| 近期原文选择 | Session Memory 动态 Token window | `session-memory-window.ts:145+` | aligned_semantically | 默认预算不同 | 否 |
| Tool 闭包 | round 与 tool pair 保持 | `session-memory-window.ts:41-104` | aligned_verified | 无 | 否 |
| 持久规则恢复 | 文件/plan/skills/tools/MCP 重新加载 | `main-agent-post-compact-continuity.ts` manifest/revalidate | aligned_semantically | CCM 额外权限 checksum | 否 |
| 原始 transcript | append-only JSONL，投影压缩 | CCM transcript/执行账本不删除 | aligned_verified | 无 | 否 |
| 压缩失败语义 | 保留原链；部分 PTL 有有界回退 | 候选失败不提交且熔断 | ccm_stricter_by_design | CCM 可用性换一致性 | 是：source fence |
| 会话恢复 | compact 节点 + chain 重建 | Boundary/Generation/journal/reconcile | ccm_stricter_by_design | 多文件需恢复协调 | 否 |
| Provider usage | 原生 usage + estimator | 身份绑定 baseline + payload checksum | aligned_semantically | 缺失 usage 时只能估算 | 是：项目正偏差计入 |
| 可观测性 | hooks/telemetry/session nodes | receipt、ledger、Boundary journal、Memory Center | ccm_stricter_by_design | 审计数据更多 | 否 |

## 6. v5 二十项代码审计矩阵

| # | 审计项 | 状态 | 代码证据 | 测试证据 / 结论 |
|---:|---|---|---|---|
| 1 | 文档与代码一致性 | implemented_verified | 本报告第 4 节的生产入口 | memory 23/23；旧文档的 49 项计数已过时 |
| 2 | Bootstrap 最小化 | implemented_verified | `third-party-memory-snapshot.ts:609+`；`final-dispatch-payload-gate.ts:197+`；`server.ts:1722+` | Hydration 68：不含原文/长期记忆，独立 32K 默认 gate |
| 3 | 首次完整 Hydration | implemented_verified | `session-model-context.ts:338-365`；snapshot `deliveryMode=full` | 早期 `OLDEST_REQUIRED_CONTEXT` 分页可读 |
| 4 | 压缩后 Hydration | implemented_verified | project projection `1068+`；group policy `2877+` | summary required + recent raw + optional archive |
| 5 | 真实 Token Gate | implemented_verified | `server.ts:1411-1467`；cross-agent `1122-1339` | Bootstrap、required hydration、tools、recovery、request、usage bias 计量 |
| 6 | 分页累计计量 | implemented_verified | `reserveReadBudget`、单页 20K、单批 20K、最终剩余预算 | 超累计预算 fail closed |
| 7 | 同 Generation 增量 | implemented_verified | snapshot `sameLineage` / prior ids | 同 Provider/generation/boundary/plan + ack 只返回 `msg_16` |
| 8 | 去重 | implemented_verified | `deliveryKey=id+version+hash`、`deliveredMemories`、segment proof | 重复正文省略；version 2 即使同正文也重新投递 |
| 9 | Boundary 改变 | implemented_verified | `sameLineage` boundary fence | `group-boundary-cursor-fence`、Hydration 68 |
| 10 | Provider 切换 | implemented_verified | provider 参与 lineage；fallback 建新 task session | `group-boundary-cursor-fence` provider switch |
| 11 | 首次 native ID 补全 | implemented_verified | `!previous.nativeSessionId || equal` | 首次 unknown -> known 后仍为 delta |
| 12 | 确认门禁 | implemented_verified | `knowledge-context-mcp.ts:153-169` | required 未读、plan/cursor/checksum 错误均拒绝 |
| 13 | 业务事件不 Compact | implemented_verified | 生产自动注册仅 message append；核心再按 Token 判断 | 低 Token 多消息不 compact；无 Todo/测试完成监听入口 |
| 14 | Token 阈值 Compact | implemented_verified | `group-compaction-engine.ts:757-851` | below-threshold 与 threshold-trigger 测试 |
| 15 | MicroCompact 边界 | implemented_verified | `session-model-context.ts` 只建投影/receipt | 原结果、transcript、artifact 保留 |
| 16 | 模型必需摘要 | implemented_verified | group/project model-required 分支 | summary 模型失败保留旧 state |
| 17 | post-compact 二次 Gate | implemented_verified | `group-compaction-engine.ts:1275-1399` | true-post gate + restart，无 Boundary 提交 |
| 18 | 原子提交 | implemented_verified | lifecycle/activity/source-prefix/compaction-identity fences + head/journal reconcile | 尾部追加保留；前缀改写失败关闭；restart 保持旧状态 |
| 19 | Skill/MCP 恢复 | implemented_verified | `main-agent-post-compact-continuity.ts` | Skill 内容、MCP schema、权限变化拒绝旧清单 |
| 20 | Scope 隔离 | implemented_verified | HMAC context + `assertSnapshotContext` + 工具不收 scope 参数 | sibling project session 读取失败 |

## 7. v5 三十个必测场景映射

| 场景 | 结果 | 主要证据 |
|---:|---|---|
| 1-5 | verified | Hydration 68：群聊/项目 full raw、summary recent、delta、version/hash 去重 |
| 6-10 | verified | 首次 native ID、已知身份/Provider/Boundary/ContextPlan/checksum fences |
| 11-14 | verified | acknowledge fail closed、HMAC exact scope、group/project target isolation |
| 15-19 | verified | group invariant、manual/auto parity、model failure、true post gate |
| 20-21 | verified | session model context：MicroCompact 仅投影且不改正式摘要/长期记忆 |
| 22-23 | verified | true-post restart；concurrent-message：尾部追加保留、前缀改写拒绝 |
| 24-25 | verified | main-agent post-compact continuity：Skill/MCP checksum 与权限重验 |
| 26-27 | verified | MCP 未同步兼容路径仍走最终 gate；只读路径不暴露无界 memory tool |
| 28 | verified | snapshot/ledger 持久化；无法证明 ack/lineage 时 full rehydration |
| 29 | implemented_but_unproven | Artifact 引用由现有执行账本/回执校验；本轮未新增独立“删除真实 Artifact”端到端夹具 |
| 30 | verified | exact-session、sibling scope、project target 与 memory delivery fencing 测试 |

场景 29 是本轮唯一未新增专用破坏性夹具的项目。生产实现不会从摘要伪造原始 Artifact，但现有 memory 域测试主要验证 checksum、引用和恢复账本，没有主动删除真实 Artifact 后跑完整 Provider 工作流；这不阻塞本次代码修复，但应保持为后续专项测试候选。

## 8. 修改清单

- `backend/modules/collaboration/group-compaction-receipts.ts`：摘要增加 `hypotheses`。
- `backend/modules/collaboration/group-compaction-projections.ts`：提取、合并、渲染 hypothesis，并禁止提升为 decision/completed。
- `backend/modules/collaboration/group-compaction-engine.ts`：模型 schema 与 prompt 加入 hypothesis 约束。
- `backend/modules/collaboration/group-memory-context.ts`：提交前消息前缀和旧 compaction identity fence。
- `backend/integrations/third-party-memory-snapshot.ts`：ContextPlan lineage、version/hash 去重、累计预算、独立 Bootstrap gate。
- `backend/integrations/internal-mcp-runtime.ts`：测试可隔离 MCP audit 文件。
- `backend/agents/final-dispatch-payload-gate.ts`：`bootstrap_limit_exceeded` 状态。
- `backend/server.ts`：项目 Hydration 计入 Provider usage 正偏差并绑定剩余读取预算；实际 worker bootstrap gate。
- `backend/modules/collaboration/collaboration-cross-agents.ts`：群聊子 Agent 把最终 payload 剩余容量签入 MCP context。
- `backend/modules/collaboration/group-memory-compaction-self-tests.ts`、`scripts/group-compaction-invariant-selftest.mjs`：hypothesis 不变量。
- `scripts/group-compaction-concurrent-message-selftest.mjs`：尾部追加与输入前缀并发改写测试。
- `scripts/third-party-memory-mcp-hydration-selftest.mjs`：68 项 Hydration/Bootstrap/预算/去重测试。
- `scripts/test-domains.json`：把 true-post restart 与并发消息测试纳入 memory 域。

`ccm-package/dist` 由 backend build 重新生成，没有直接手工编辑。

## 9. 验证结果

| 命令 | 结果 |
|---|---|
| `npm run check` | pass |
| `npm run build:backend` | pass；第一次受运行中 CCM 的 Windows 文件占用影响，安全重试后通过 |
| `node scripts/third-party-memory-mcp-hydration-selftest.mjs` | pass，68 checks，0 paid calls |
| `node scripts/group-compaction-invariant-selftest.mjs` | pass，含 hypothesis gate |
| `node scripts/true-post-compact-payload-recompact-restart-selftest.mjs` | pass |
| `node scripts/group-compaction-concurrent-message-selftest.mjs` | pass，8 checks |
| `npm run test:memory` | pass，23 files / 0 failed |

最终生成报告：`scratch/domain-test-report.json`。

## 10. 保留的风险与非目标

1. 官方 Claude Code 2.1.220 是二进制；精确私有实现仍属于 `unknown_insufficient_evidence`。
2. 本地参考仓库的 Reactive Compact 内部模块是桩，只有外部单次重试语义可证。
3. CCM 的原子性是“逐文件原子写 + commit fences + checksum journal + restart reconciliation”，不是把 transcript、memory、head 和所有 sidecar 放进一个数据库 ACID 事务；现有失败/重启语义已测试。
4. 本轮测试使用本地模型夹具和 MCP 进程，付费 Provider 调用为 0；真实 Provider 的最终 usage 漂移仍由生产 baseline 校准和 PTL fail-closed 处理。
5. 没有重写 Context Engine、Memory Service 或 ThirdPartyAgentAdapter，也没有改变平台主 Agent 直接构造上下文、第三方子 Agent 走签名 MCP 的架构边界。
