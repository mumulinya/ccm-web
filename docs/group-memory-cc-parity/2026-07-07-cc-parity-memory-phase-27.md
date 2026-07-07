# CCM Memory CC Parity Phase 27 - Memory Gate Visible Surfaces

## Goal

让 Phase 26 已经具备的子 Agent 记忆派发 gate 回执校验，进入用户可见和运行时可观测层：

- 主 Agent 验收检查能明确显示 `记忆 gate 回执` 是否通过。
- 子 Agent 协调协议能展示本轮群聊记忆 gate 的通过/缺失状态。
- 运行时 kernel snapshot 能携带 `memory_gate` 摘要，便于任务卡和技术详情追踪。
- 结果复检可以把“缺少记忆使用声明”作为单独定向返工缺口，而不是只混在弱回执评分中。

这一步对齐 Claude Code 记忆系统的一个关键体验：压缩/派发后的记忆不只是内部数据，还必须在下一次 Agent 执行和验收时可追踪、可证明、可修正。

## Claude Code Reference

继续沿用前面阶段对 `D:\claude-code` 的参考方向：

- `CLAUDE.md` / project memory 被装载后会进入执行上下文，而不是停留在存储层。
- compact 后的上下文必须有后续可恢复路径，避免压缩完成但后续会话不知道使用了什么。
- hook / cleanup / post-compact recovery 的核心价值是可审计：记忆何时刷新、是否被使用、是否需要重载。

本阶段对应 CCM 的落点是：子 Agent 每次都是新的第三方会话，因此群聊记忆派发后必须有可见回执链路。

## Implementation

### Backend

更新 `backend/modules/collaboration/collaboration.ts`：

- 新增 `buildMemoryGateVisibleSummary()`：
  - 输出 `ccm-memory-gate-visible-summary-v1`。
  - 包含 `required`、`pass`、`status`、`status_label`、`summary`、`gate_ids`、`missing_gate_ids`、逐 Agent `rows`。
  - 兼容 `memory_dispatch_gates`、`memory_gate_receipt_rows`、camelCase 字段。
- `buildUserAcceptanceReview()` 新增用户可见检查：
  - `id=memory_gate_receipt`
  - label 为 `记忆 gate 回执`
  - 缺少 gate 引用会进入 `missing`，阻止“证据齐全”的用户结论。
- `buildAcceptanceGate()` 使用同一个 visible summary，避免 acceptance gate 和任务卡验收口径不一致。
- `buildRuntimeKernelSnapshot()` 新增 `memory_gate`。
- `buildUserAgentCoordinationProtocol()`：
  - 使用 `summary.memory_dispatch_gates` 重新评分 receipt。
  - 返回 `memory_gate_summary`。
  - health score 会被未通过的 memory gate 拉低。
- `buildCoordinationEventStream()` 新增 `memory_gate_receipt` 事件。
- `buildTargetedReworkSuggestions()` 和 `buildUserReceiptReworkSummary()`：
  - 将缺少 gate 引用转成 `memory_gate_receipt` 定向返工。
  - 返工标题为 `补充记忆使用声明`。
- `buildDeliverySummary()`：
  - 持久化 `memory_gate_summary`。
  - 修正边界：有 gate 但没有任何可验证 receipt 时，不默认通过 memory gate。

### Frontend

更新 `frontend/src/utils/taskExperience.js`：

- `buildReceiptReworkSummary()` 可读取：
  - `memory_gate_receipt_rows`
  - `memoryGateReceiptRows`
  - `memory_gate_summary.rows`
  - `agent_coordination.memory_gate_summary.rows`
- 缺失 gate 引用会生成 `memory_gate_receipt` gap 和 targeted rework action。

更新 `frontend/src/components/tasks/TaskExperienceCard.vue`：

- 新增 `memoryGateSummary` computed。
- 在协作状态区加入 `记忆派发校验` 小面板。
- 只在 `memoryGateSummary.required` 时显示，避免普通任务噪音。
- 状态支持：
  - `passed` -> 已通过
  - `missing_receipt_reference` -> 缺记忆声明
  - `not_required` -> 未触发

## Selftests

扩展 `runCollaborationUxSelfTest()`，新增 `memoryGateGapCard` fixture：

- 派发 `gmd_ux_gate` 给 `collab-web`。
- 子 Agent 回执声明了普通记忆，但没有引用 gate id。
- 断言覆盖：
  - `memoryGateAcceptanceReviewVisible`
  - `agentCoordinationMemoryGateVisible`
  - `receiptReworkMemoryGateGapVisible`
  - `runtimeKernelShowsMemoryGate`
  - `agentCoordinationMemoryGateEventVisible`

## Verification

已通过：

```powershell
npm run check
npm run build:backend
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runCollaborationUxSelfTest(); console.log(JSON.stringify({pass:result.pass, failed:Object.entries(result.checks).filter(([k,v])=>!v).map(([k])=>k)},null,2)); if(!result.pass) process.exit(1);"
node -e "const collab=require('./ccm-package/dist/modules/collaboration/collaboration.js'); const result=collab.runMemoryDispatchGateReceiptValidationSelfTest(); console.log(JSON.stringify({pass:result.pass,checks:result.checks},null,2)); if(!result.pass) process.exit(1);"
npm run build:frontend
```

宽回归：

```json
{
  "pass": true,
  "count": 38,
  "coverage": [
    "typed memory index/load plan/log distillation/distillation quality/path condition",
    "project/global Claude memory import",
    "Claude memory setting source policy and external include approval",
    "instructions loaded hook pipeline",
    "global/project/typed memory context",
    "auto compaction, dispatch freshness gate, reload audit, source manifest, source-change reload",
    "compact warning, compaction hook/integration/stress, micro compact, partial compact, sidecar",
    "post compact recovery audit, preserved segment, PTL emergency/recovery, quality gate, time-based micro compact",
    "worker handoff",
    "memory dispatch gate receipt validation",
    "collaboration protocol and UX"
  ]
}
```

## Operational Memory

- 群聊主 Agent 现在不仅会派发群聊记忆，还会检查子 Agent 是否在结果说明中引用该派发 gate。
- 若第三方子 Agent 新开会话后没有声明本轮记忆使用/忽略，任务卡会显示 `记忆派发校验` 和 `补充记忆使用声明`。
- 这让多群聊、多项目子 Agent 的记忆使用链路更接近 CC：可压缩、可派发、可证明、可返工。

## Still Open

后续继续对照 CC 源码增强：

- compact 后的“下一轮上下文重注入”可增加更细粒度的来源权重解释。
- memory gate 可进一步和 prompt cache / context pressure 联动：当 gate 缺失时自动降低完成置信度并触发更短的补充提示。
- 可以为多群聊并行任务增加 cross-group memory collision / stale-source 可视化。
- 可以增加前端 Memory Center 中的 gate audit 过滤视图，按群聊、项目、子 Agent、gate id 查缺口。
