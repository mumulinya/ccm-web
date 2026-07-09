# Phase 91 - Native Proof Repair Dispatch Candidates

日期：2026-07-08

## 目标

Phase 90 已经能把 API microcompact `native_applied` 强证明缺口物化为 `group-memory-replay-repair-work-items`。Phase 91 继续补上主 Agent 派发前的关键一环：证明这些 native proof repair work items 会进入 `Main Agent replay repair dispatch candidates`，并且候选上下文携带 proof、request checksum、session、dispatch、runner 等元数据。

这一步仍然保持 Memory Center 的边界：只生成主 Agent 可读候选和质量门禁，不自动创建真实任务，也不替主 Agent 擅自派发子 Agent 会话。

## 本次实现

- 在 `backend/modules/knowledge/memory-control-center.ts` 增加 `api_microcompact_native_apply_proof_repair_dispatch_candidates` 质量检查。
- 新增 report schema：`ccm-api-microcompact-native-apply-proof-repair-dispatch-candidate-report-v1`。
- 专门筛选 `source=api_microcompact_native_apply_binding_repair` 的 open repair work items，并要求 critical/high、已认领或带 `dispatch_target` 的项进入主 Agent dispatch candidates。
- 校验候选是否保留 native proof 元数据：`proof_entry_id`、`plan_checksum`、`request_patch_checksum`、`request_telemetry_*`、`runner_request_id`、`execution_id`。
- 将该检查挂入 Memory Center quality descriptor 和 overview alerts。
- 在 `backend/modules/collaboration/memory.ts` 的子 Agent 记忆包渲染中，为 dispatch candidate 行补充 `proof/request/source/session/dispatch/runner` 标记。
- 新增自测 `runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest`，覆盖：
  - proof gap 生成 native repair work items；
  - repair work items 进入主 Agent dispatch candidates；
  - candidate 携带 proof/telemetry/runner 元数据；
  - 子 Agent context bundle 渲染这些元数据；
  - proof 修复后 native candidates 不再出现。

## 验证

已通过：

```powershell
npm run build:backend
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyDispatchBindingSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterReplayRepairDispatchCandidateSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
npm run check
npm run build
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.buildMemoryQualityReport({checkIds:['api_microcompact_native_apply_proof_repair_dispatch_candidates'],refresh:true,writeTargeted:false}); console.log(JSON.stringify({status:r.status, checks:r.checks.map(c=>({id:c.id,status:c.status,checked:c.checked,passed:c.passed,score:c.score,gaps:(c.gaps||[]).length}))},null,2)); if(r.unknownCheckIds&&r.unknownCheckIds.length) process.exit(1);"
```

关键自测结果：

- `expectedCandidateCount=2`
- `coveredCandidateCount=2`
- `metadataGapCount=0`
- `proofEntryCandidateCount=2`
- `runnerBoundCandidateCount=2`

## 剩余差距

- 主 Agent 仍未自动把这些 repair candidates 转为真实子 Agent 任务；目前只是稳定上下文和质量门禁。
- Memory Center 前端还没有 dedicated native proof repair dispatch candidate 面板。
- 多群聊/Global Agent 层面的聚合排序还可继续增强，例如跨群聊同类 proof 缺口聚类。
- 真实第三方 runner 的 replay evidence 还需要更多端到端样本覆盖，当前 Phase 91 主要证明 CCM 内部 sidecar 到 context 的链路。
