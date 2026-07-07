# CCM Memory CC Parity Phase 29 - Candidate-Level Reinjection Acknowledgement

## Goal

Phase 28 已经把 compact 后的重注入候选升级为 `pcrg_*` gate。本阶段继续收紧闭环：子 Agent 不能只声明“我看到了重注入 gate”，还必须证明它至少核对了具体候选。

新的要求：

- 每条 post-compact reinjection candidate 都有稳定 `candidate_id`，形如 `pcrc_*`。
- 子 Agent 回执 `memoryUsed` / `memoryIgnored` 必须引用：
  - `reinjection_gate_id=pcrg_*`
  - 至少一个 `candidate_id=pcrc_*`，或候选值本身，或明确写“全部候选已检查/忽略”。
- 只引用 gate、没有候选级声明的回执会被降为 partial，不能通过 good。

## Claude Code Reference

对照 `D:\claude-code`：

- `src/services/compact/compact.ts` 的 compact boundary 会携带 preserved segment 和 `preCompactDiscoveredTools` 等元数据。
- `src/utils/toolSearch.ts` 会从 compact boundary 读回 pre-compact discovered tools，避免压缩摘要吞掉工具引用状态。
- 关键思想是：compact boundary 不只是一段摘要，还携带可恢复、可核对的元数据。

CCM 本阶段的映射是：`postCompactReinject` 候选不再只是自然语言列表，而是可被子 Agent 回执逐项引用的 candidate metadata。

## Implementation

### Memory Bundle

更新 `backend/modules/collaboration/memory.ts`：

- `normalizePostCompactReinjectionRows()` 现在为每条候选生成稳定：
  - `candidate_id: pcrc_*`
  - `kind`
  - `value`
  - `sourceMessageId`
  - `actor`
  - `taskId`
- `buildGroupMemoryPostCompactReinjectionGate()` 的 receipt contract 增加：
  - `required_candidate_reference: at_least_one_candidate_id_or_value_or_all_candidates_statement`
  - `candidate_ids`
- `renderGroupMemoryContextBundle()` 渲染：
  - `candidate_id=pcrc_*`
  - 候选类型和值
  - source message id
  - 回执必须引用 candidate id / 候选值 / 全部候选声明

### Worker Handoff

更新 `backend/agents/worker-handoff.ts`：

- `renderPostCompactReinjectionGate()` 会显示 `candidate_refs`。
- `runWorkerHandoffSelfTest()` 增加 `pcrc_worker_file` 保留断言。

### Main Agent Validation

更新 `backend/modules/collaboration/collaboration.ts`：

- `collectTaskPostCompactReinjectionGates()` 会保留 candidate metadata。
- 新增 `evaluatePostCompactReinjectionCandidateReference()`：
  - 检查 `candidate_id`
  - 检查候选值
  - 检查“全部/所有/all candidates”声明
- `evaluateReceiptPostCompactReinjectionGate()` 新增：
  - `candidate_reference_required`
  - `candidate_reference_passed`
  - `referenced_candidate_ids`
  - `all_candidates_declared`
  - `missing_candidate_reference_gate_ids`
  - `candidate_rows`
- `scoreChildAgentReceipt()` 新增 check：
  - `id=post_compact_reinjection_candidate`
  - label=`声明压缩重注入候选`
  - 缺失时 hard fail，结果最高 partial。
- `buildPostCompactReinjectionGateVisibleSummary()` 支持：
  - `missing_candidate_reference`
  - `missing_candidate_reference_gate_ids`
  - candidate-level reason 文案

### Frontend

更新：

- `frontend/src/utils/taskExperience.js`
  - `buildReceiptReworkSummary()` 支持 `missing_candidate_reference`。
  - 缺候选声明时生成 `补充压缩记忆使用声明`。
- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - `reinjectionGateStatusLabel()` 增加 `missing_candidate_reference -> 缺候选声明`。
  - warning 样式覆盖 `missing_candidate_reference`。

## Selftests

扩展 `runPostCompactReinjectionGateReceiptValidationSelfTest()`：

- good receipt：
  - 引用 `reinjection_gate_id=pcrg_receipt_gate_selftest`
  - 引用 `candidate_id=pcrc_receipt_file`
  - pass，grade=good。
- ignored receipt：
  - 引用 gate
  - 声明“全部候选”
  - pass，grade=good。
- missing gate receipt：
  - 有候选值但没有 gate
  - hard fail。
- missing candidate receipt：
  - 有 gate 但没有 candidate id / 候选值 / 全部候选声明
  - hard fail，grade=partial。

扩展 `runGroupTypedMemoryContextSelfTest()`：

- rendered memory bundle 必须包含 `candidate_id=pcrc_`。

扩展 `runWorkerHandoffSelfTest()`：

- rendered worker handoff 必须包含 `pcrc_worker_file`。

## Verification

已通过：

```powershell
npm run check
npm run build:backend
npm run build:frontend
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runPostCompactReinjectionGateReceiptValidationSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks,missingCandidate:result.missingCandidate},null,2)); if(!result.pass) process.exit(1);"
node -e "const memory=require('./ccm-package/dist/modules/collaboration/memory.js'); const result=memory.runGroupTypedMemoryContextSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
node -e "const handoff=require('./ccm-package/dist/agents/worker-handoff.js'); const result=handoff.runWorkerHandoffSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:result.pass,failed:Object.entries(result.checks).filter(([k,v])=>!v).map(([k])=>k)},null,2)); if(!result.pass) process.exit(1);"
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runMemoryDispatchGateReceiptValidationSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
```

宽回归：

```json
{
  "pass": true,
  "count": 39
}
```

## Operational Memory

- `pcrg_*` 表示本轮存在 compact 后重注入 gate。
- `pcrc_*` 表示具体重注入候选。
- 子 Agent 如果只写 `reinjection_gate_id=pcrg_*`，但没有说明候选使用/忽略情况，主 Agent 会要求补充。
- 这让“压缩后上下文重注入”更接近 CC compact boundary 的元数据恢复机制。

## Still Open

继续对齐方向：

- 增加 compact 后首轮子 Agent 派发 telemetry，类似 CC 的 `pendingPostCompaction` 标记。
- 对候选级声明进一步细化为 used / ignored / verified 三态。
- Memory Center 增加按 `pcrg_*` / `pcrc_*` 查询的 gate audit 视图。
- 对第三方 CLI prompt 尾部丢失风险，可把 gate/candidate receipt contract 额外注入短 system reminder。
