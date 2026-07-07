# Phase 30 - CC parity post-compact first dispatch marker

日期：2026-07-07

## 目标

继续把 CCM 群聊记忆系统向 Claude Code 记忆压缩体系对齐。本阶段补齐 Claude Code `pendingPostCompaction` / `consumePostCompaction` 风格的“压缩后首次使用”语义，但改成适配 CCM 的持久化、多群聊、多子 Agent 模型：

- Claude Code 是单会话内存 flag：压缩后置位，下一次 API success 消费一次。
- CCM 的子 Agent 往往是 Claude Code / Cursor / Codex 等第三方新会话，不能只靠进程内 flag。
- 因此本阶段按 `groupId + compact boundary + targetProject` 持久记录子 Agent 派发序号。

## 实现

新增 `ccm-post-compact-first-dispatch-marker-v1`：

- `marker_id=pcfd_*`
- `boundary_id=pcb_*`
- `first_dispatch_after_compact`
- `dispatch_sequence`
- `summary_checksum`
- `target_project`
- `reinjection_gate_id`
- `candidate_count`

新增 ledger：

- 位置：`CCM_DIR/group-memory-post-compact-dispatch/<groupId>.json`
- 分桶：`child:<targetProject>|<boundary_id>`
- 语义：同一压缩边界下，同一子 Agent 第一次派发为 `sequence=1 / first=true`，第二次为 `sequence=2 / first=false`；换目标 Agent 单独计数。

接入点：

- `backend/modules/collaboration/memory.ts`
  - 构建 post-compact first dispatch marker。
  - 写入独立 dispatch ledger。
  - 将 marker 放入 group memory context bundle。
  - 在渲染给子 Agent 的记忆包中显示“压缩后派发标记”。
- `backend/agents/worker-handoff.ts`
  - 从 memory context 中提取 marker。
  - 保存在 handoff references。
  - 渲染进自包含 Worker 工作包。
- `backend/modules/collaboration/collaboration.ts`
  - 从 task timeline / assignment evidence / worker handoff / worker context packet 收集 marker。
  - 写入 delivery summary。
  - 写入 runtime kernel。
  - 写入 agent coordination visible summary 和 event stream。
- `frontend/src/components/tasks/TaskExperienceCard.vue`
  - 在协作状态中展示“压缩派发标记”。
  - 在技术详情中展示“压缩派发”计数和 marker id。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run build:mcp-feishu`
- `npm run test:chat-experience`
- `runGroupPostCompactFirstDispatchMarkerSelfTest`
- `runWorkerHandoffSelfTest`
- `runPostCompactDispatchMarkerVisibleSelfTest`
- `runPostCompactReinjectionGateReceiptValidationSelfTest`
- `runGroupTypedMemoryContextSelfTest`
- `runGroupMemoryDispatchFreshnessGateSelfTest`
- `runMemoryDispatchGateReceiptValidationSelfTest`
- `runCollaborationUxSelfTest`

关键自测结果：

- 同一群聊、同一压缩边界、同一 `api` 子 Agent：
  - 第一次派发：`first_dispatch_after_compact=true`, `dispatch_sequence=1`
  - 第二次派发：`first_dispatch_after_compact=false`, `dispatch_sequence=2`
- 同一群聊、同一压缩边界、不同 `frontend` 子 Agent：
  - 独立第一跳：`first_dispatch_after_compact=true`, `dispatch_sequence=1`
- worker handoff 能保留并渲染 `pcfd_*`。
- runtime kernel / task card 能显示 marker。

## 价值

本阶段补上了压缩恢复后的“第一跳可观测性”：

- 主 Agent 可以区分“压缩后第一轮恢复上下文派发”和“同一压缩边界后的普通后续派发”。
- 多个群聊互不影响。
- 同一群聊内多个项目子 Agent 独立计数。
- 第三方子 Agent 每次新会话时，也能从自包含工作包看到自己是否处于压缩后的第一跳。

## 后续

下一阶段可以继续增强：

- candidate 使用三态：`used / ignored / verified`。
- Memory Center 增加 `pcfd_* / pcb_* / pcrc_*` 筛选。
- 在 prompt 尾部重复压缩后 gate / marker 回执提醒，降低第三方 CLI 截断风险。
- 将 first-dispatch marker 与压缩恢复质量评分联动，排查“压缩后第一跳未正确使用记忆”的场景。
