# Phase 93 - Native Proof Repair Assignment Bindings

日期：2026-07-08

## 目标

Phase 92 已把 native proof repair dispatch candidate 编译成可恢复的主 Agent worker brief。Phase 93 继续把 brief 绑定到真实主 Agent assignment 证据链：

`dispatch brief -> assignment -> WorkerContextPacket -> binding ledger`

这一步仍不自动创建真实任务。只有当主 Agent 已经生成 assignment，且 assignment 内容明确匹配 ready repair brief 时，才记录绑定。

## 本次实现

- 新增 sidecar 目录：`group-memory-replay-repair-dispatch-bindings`。
- 在 `backend/modules/collaboration/group-orchestrator.ts` 增加：
  - `readReplayRepairDispatchBindingLedgerForCoordinator`
  - `recordReplayRepairDispatchBriefAssignmentBinding`
  - ready dispatch brief 到 assignment 的匹配逻辑。
- `buildAssignment` 现在会生成稳定的：
  - `assignmentId`
  - `dispatchKey`
  - `taskFingerprint`
  - `scopeId`
- 当 assignment 匹配 ready dispatch brief 时，会写入：
  - `assignment.replay_repair_dispatch_brief`
  - `worker_context_packet.replay_repair_dispatch_briefs`
  - `group-memory-replay-repair-dispatch-bindings/<group>.json`
- `backend/agents/runtime-kernel.ts` 的 `WorkerContextPacket` 支持渲染 replay repair dispatch brief，并要求回执引用 `brief_id/work_item_id`。
- `backend/modules/knowledge/memory-control-center.ts` 增加质量检查：
  - `api_microcompact_native_apply_proof_repair_assignment_bindings`
  - report schema：`ccm-api-microcompact-native-apply-proof-repair-assignment-binding-report-v1`
- 新增自测：
  - `runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest`

## 验证

已通过：

```powershell
npm run build:backend
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairAssignmentBindingSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const g=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=g.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.buildMemoryQualityReport({checkIds:['api_microcompact_native_apply_proof_repair_assignment_bindings'],refresh:true,writeTargeted:false}); console.log(JSON.stringify({status:r.status, checks:r.checks.map(c=>({id:c.id,status:c.status,checked:c.checked,passed:c.passed,score:c.score,gaps:(c.gaps||[]).length}))},null,2)); if(r.unknownCheckIds&&r.unknownCheckIds.length) process.exit(1);"
npm run check
npm run build
```

关键自测结果：

- `bindingCount=1`
- `validBindingCount=1`
- `metadataGapCount=0`
- `proofEntryBindingCount=1`
- `runnerBoundBindingCount=1`
- `workerContextPacketBindingCount=1`

## 剩余差距

- Phase 93 证明了 brief 到 assignment/WorkerContextPacket 的绑定，但还没有把真实子 Agent session / runner execution / final proof ledger 统一成完整闭环。
- 下一阶段应继续绑定：
  - assignment binding -> task timeline dispatch event
  - child Agent session snapshot
  - external runner request id
  - native proof ledger 修复结果
- Memory Center 前端仍缺 dedicated dispatch binding 面板。
- 跨群聊聚合仍可继续增强，让全局 Agent 能看到多个群聊反复出现的 native proof repair 类问题。
