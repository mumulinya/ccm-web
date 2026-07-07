# CCM Memory CC Parity Phase 28 - Post-Compact Reinjection Gate

## Goal

把“压缩后重注入候选”从普通上下文提示升级为可派发、可回执、可验收的 gate。

Phase 27 已经让 `dispatch_freshness_gate` 可见并可验收。本阶段补齐另一半：当群聊旧消息被 compact 后，系统提取出的旧文件、技能/工具、验证、阻塞线索必须进入子 Agent 上下文，并且子 Agent 的 `memoryUsed` / `memoryIgnored` 必须声明是否使用这些重注入候选。

## Claude Code Reference

对照 `D:\claude-code`：

- `src/services/compact/compact.ts` 会生成 post-compact message/attachment，并用 compact boundary 替换下一轮 API messages。
- `src/utils/toolSearch.ts` 会把 pre-compact discovered tools 快照到 `compactMetadata.preCompactDiscoveredTools`，之后从 compact boundary 读回。
- `src/bootstrap/state.ts` 通过 `markPostCompaction()` / `consumePostCompaction()` 标记 compact 后的首轮调用，便于区分 compact 造成的 cache miss 和普通 TTL 过期。

CC 的关键点不是“生成摘要就结束”，而是 compact boundary 必须携带下一轮需要恢复的上下文元数据。CCM 的对应增强是：把 `postCompactReinject` 做成 child Agent 必须确认的 gate。

## Implementation

### Memory Bundle

更新 `backend/modules/collaboration/memory.ts`：

- 新增 `GROUP_MEMORY_POST_COMPACT_REINJECTION_GATE_VERSION`。
- 新增内部 helper：
  - `normalizePostCompactReinjectionRows()`
  - `buildGroupMemoryPostCompactReinjectionGate()`
- `buildAgentMemoryContextBundle()` 现在会在存在 `postCompactReinject` 候选时生成：
  - `post_compact_reinjection_gate`
  - schema: `ccm-child-agent-post-compact-reinjection-gate-v1`
  - gate id: `pcrg_*`
  - candidates: file / skill / verification / blocker
  - post compact recovery audit 摘要
  - receipt contract：`memoryUsed` / `memoryIgnored` 必须引用 gate id
- `renderGroupMemoryContextBundle()` 会渲染：
  - `压缩后重注入门禁`
  - gate id
  - candidate count
  - summary checksum
  - 回执引用要求

### Worker Handoff

更新 `backend/agents/worker-handoff.ts`：

- 新增 `extractPostCompactReinjectionGate()`。
- 新增 `renderPostCompactReinjectionGate()`。
- `buildSelfContainedWorkerHandoff()` 会把 gate 放进：
  - `references.post_compact_reinjection_gate`
  - `user_summary.completeness.has_post_compact_reinjection_gate`
- `renderSelfContainedWorkerHandoff()` 会在平台记忆区渲染该 gate。
- `runWorkerHandoffSelfTest()` 增加 gate 保留断言。

### Main Agent Validation

更新 `backend/modules/collaboration/collaboration.ts`：

- 新增 gate 收集和验证：
  - `extractPostCompactReinjectionGateFromValue()`
  - `collectTaskPostCompactReinjectionGates()`
  - `evaluateReceiptPostCompactReinjectionGate()`
  - `buildPostCompactReinjectionGateVisibleSummary()`
- `scoreChildAgentReceipt()` 新增检查：
  - `id=post_compact_reinjection_gate`
  - label: `引用压缩后重注入 gate`
  - 缺失时 hard fail，score 最高 70，不能 grade=good。
- `buildDeliverySummary()` 持久化：
  - `post_compact_reinjection_gates`
  - `post_compact_reinjection_gate_count`
  - `post_compact_reinjection_gate_receipt_passed`
  - `post_compact_reinjection_gate_receipt_rows`
  - `post_compact_reinjection_gate_summary`
- `buildAcceptanceGate()` 新增：
  - `id=post_compact_reinjection_gate_receipt`
  - label: `压缩重注入回执`
- `buildUserAcceptanceReview()` 新增用户可见检查：
  - `压缩重注入回执`
- `buildRuntimeKernelSnapshot()` 新增：
  - `post_compact_reinjection_gate`
- `buildUserAgentCoordinationProtocol()` 新增：
  - `post_compact_reinjection_gate_summary`
  - health score 会被未通过 gate 拉低
- `buildUserReceiptReworkSummary()` 新增定向返工：
  - `post_compact_reinjection_gate_receipt`
  - 标题：`补充压缩记忆使用声明`

### Frontend

更新：

- `frontend/src/utils/taskExperience.js`
  - `buildReceiptReworkSummary()` 可从 delivery summary / agent coordination 读取 post-compact reinjection gate rows。
  - 缺 gate 引用会生成 `补充压缩记忆使用声明`。
- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 新增 `reinjectionGateSummary` computed。
  - 协作状态区新增 `压缩重注入校验`。
  - 只在 `required=true` 时显示。

## Selftests

新增：

- `runPostCompactReinjectionGateReceiptValidationSelfTest()`
  - good receipt 引用 `reinjection_gate_id=pcrg_receipt_gate_selftest` -> pass。
  - ignored receipt 在 `memoryIgnored` 引用 gate -> pass。
  - missing receipt 未引用 gate -> hard fail，acceptance gate blocked。
  - runtime kernel 和 visible summary 能看到 candidate count。

扩展：

- `runGroupTypedMemoryContextSelfTest()`
  - bundle 记录 `post_compact_reinjection_gate`。
  - rendered text 包含真实 gate id。
- `runWorkerHandoffSelfTest()`
  - self-contained worker handoff 保留并渲染 gate。
- `runCollaborationUxSelfTest()`
  - 新增 `reinjectionGateGapCard`。
  - 验证 acceptance review、agent coordination、receipt rework、runtime kernel、coordination event 均可见。

## Verification

已通过：

```powershell
npm run check
npm run build:backend
npm run build:frontend
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runPostCompactReinjectionGateReceiptValidationSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runMemoryDispatchGateReceiptValidationSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
node -e "const handoff=require('./ccm-package/dist/agents/worker-handoff.js'); const result=handoff.runWorkerHandoffSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:result.pass,failed:Object.entries(result.checks).filter(([k,v])=>!v).map(([k])=>k)},null,2)); if(!result.pass) process.exit(1);"
```

宽回归：

```json
{
  "pass": true,
  "count": 39,
  "added": "collab.runPostCompactReinjectionGateReceiptValidationSelfTest"
}
```

## Operational Memory

- 群聊 compact 后提取出的旧文件/技能/验证/阻塞线索，现在不只是出现在文本里。
- 每个子 Agent 派发包会带 `pcrg_*` gate。
- 子 Agent 如果使用或忽略这些压缩前重注入候选，都必须在 `memoryUsed` / `memoryIgnored` 引用 gate id。
- 主 Agent 会把缺失引用当作验收缺口，并生成精准返工项。

## Still Open

继续向 CC 对齐的后续方向：

- 增加类似 CC `pendingPostCompaction` 的“compact 后首轮子 Agent 派发”统计，区分 compact recovery miss 和普通 stale memory。
- 为 `post_compact_reinjection_gate` 增加候选级引用，而不是只要求 gate id。
- Memory Center 可增加 gate audit 过滤：freshness gate、reinjection gate、source reload、child receipt usage。
- 可以把 gate id 注入项目子 Agent 的更短 system reminder，降低第三方 CLI 长 prompt 丢失尾部回执约束的风险。
