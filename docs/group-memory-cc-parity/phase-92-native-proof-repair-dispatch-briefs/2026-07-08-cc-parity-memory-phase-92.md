# Phase 92 - Native Proof Repair Dispatch Briefs

日期：2026-07-08

## 目标

Phase 91 已证明 API microcompact `native_applied` 强证明修复项能进入主 Agent 的 replay repair dispatch candidates。Phase 92 继续补齐候选到主 Agent 派发前的可恢复证据链：把 native proof repair candidate 编译成稳定 sidecar 中的自包含 worker brief，供主 Agent 在有当前执行授权时复制为 `targets[].task`。

参照 Claude Code 的方向：

- `D:\claude-code\src\coordinator\coordinatorMode.ts` 强调 coordinator 必须把 worker prompt 写成自包含、可执行、带验证要求的任务。
- `D:\claude-code\src\entrypoints\sdk\coreSchemas.ts` / `sessionStoragePortable.ts` 保留 `compact_boundary` 作为 resume 边界。
- `task_notification/task_id` 模型要求 worker 状态可追踪、可续跑。

CCM 这一步对应的是：repair candidate 不只在 prompt 中临时出现，还要有可回放的 dispatch brief ledger。

## 本次实现

- 新增 sidecar 目录：`group-memory-replay-repair-dispatch-plans`。
- 在 `backend/modules/collaboration/group-orchestrator.ts` 增加：
  - `syncReplayRepairDispatchPlansForCoordinator`
  - `buildReplayRepairDispatchBriefForCoordinator`
  - `readReplayRepairDispatchPlanLedgerForCoordinator`
- 主 Agent replay repair prompt 现在会显示：
  - candidate native proof metadata；
  - dispatch brief ledger 文件；
  - 可复制到 `targets[].task` 的 workerTask 摘要；
  - `shouldCreateRealTask=false` 边界。
- 在 `backend/modules/knowledge/memory-control-center.ts` 增加质量检查：
  - `api_microcompact_native_apply_proof_repair_dispatch_briefs`
  - report schema：`ccm-api-microcompact-native-apply-proof-repair-dispatch-brief-report-v1`
- Brief 必须保留：
  - `proof_entry_id`
  - `plan_checksum`
  - `request_patch_checksum`
  - `request_telemetry_source/status/session_status/dispatch_status`
  - `runner_request_id`
  - `execution_id`
  - `CCM_AGENT_RECEIPT` 回执要求
- 新增自测：
  - `runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest`

## 验证

已通过：

```powershell
npm run build:backend
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchBriefSelfTest(); console.log(JSON.stringify(r,null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairDispatchCandidateSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterApiMicrocompactNativeApplyProofRepairWorkItemSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.runMemoryCenterReplayRepairDispatchCandidateSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const g=require('./ccm-package/dist/modules/collaboration/group-orchestrator.js'); const r=g.runCoordinatorProtocolSelfTest(); console.log(JSON.stringify({pass:r.pass,checks:r.checks},null,2)); if(!r.pass) process.exit(1);"
node -e "const m=require('./ccm-package/dist/modules/knowledge/memory-control-center.js'); const r=m.buildMemoryQualityReport({checkIds:['api_microcompact_native_apply_proof_repair_dispatch_briefs'],refresh:true,writeTargeted:false}); console.log(JSON.stringify({status:r.status, checks:r.checks.map(c=>({id:c.id,status:c.status,checked:c.checked,passed:c.passed,score:c.score,gaps:(c.gaps||[]).length}))},null,2)); if(r.unknownCheckIds&&r.unknownCheckIds.length) process.exit(1);"
npm run check
npm run build
```

关键自测结果：

- `expectedBriefCount=2`
- `coveredBriefCount=2`
- `readyBriefCount=2`
- `metadataGapCount=0`
- `proofEntryBriefCount=2`
- `runnerBoundBriefCount=2`

## 剩余差距

- 目前 brief 仍是主 Agent 派发前的可恢复上下文，不会自动创建真实项目子 Agent 任务。
- 下一阶段应把 brief 与真实 `assignments` / task timeline / runner request 回写绑定，形成 “brief -> target task -> child session -> proof ledger” 端到端证据。
- Memory Center 前端还没有专门展示 dispatch brief ledger 的面板。
- 跨群聊聚合仍可增强：同类 native proof 缺口可以跨群聊聚类，帮助全局 Agent 提前识别系统性问题。
