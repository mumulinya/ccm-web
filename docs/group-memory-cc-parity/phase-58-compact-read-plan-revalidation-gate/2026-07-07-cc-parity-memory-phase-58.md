# Phase 58 - Compact Read Plan Revalidation Gate

## 目标

Phase 57 已经能发现历史下发的 compact read plan 源文件是否变化。本阶段把这个发现升级成可审计门禁：当历史 read plan 指向的源在下发后发生变化，下一次子 Agent 记忆包必须显式要求重新读取当前源，Memory Center 必须检查回执是否完成 `read_plan_id + current source verified` 闭环。

## 本次升级

- 新增 `compact_file_reference_read_plan_revalidation_gate`。
- 子 Agent 记忆包会基于历史 surfacing ledger 生成 revalidation gate，而不是只看新生成的当前 read plan。
- surfacing ledger 新增 `read_plan_revalidation_gate` 快照，保留当次下发时要求重读的 stale read plan。
- 子 Agent prompt 新增 `must re-read read_plan_id=...` 段落。
- 全局 Agent 多群聊上下文新增 read plan revalidation gate 摘要。
- Memory Center 群聊详情新增：
  - `compactFileReferenceReadPlanRevalidationGate`
  - `compactFileReferenceReadPlanRevalidationDiscipline`
- Memory Center 前端新增 `Read Plan Revalidation` 面板。
- 新增质量检查 `compact_file_reference_read_plan_revalidation_gate`。
- 新增自测 `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`。

## 行为规则

- 如果历史 read plan 的源文件 checksum/mtime/bytes 变化，则 gate 状态为 `required`。
- `required_entries` 中每个 stale `read_plan_id` 都必须在使用旧摘要或 compact memory 前重新读取当前源。
- 子 Agent 回执必须在 `memoryUsed` 或 `memoryIgnored` 中声明：
  - `revalidation_gate_id`
  - stale `read_plan_id`
  - `re-read/current source verified`，或说明该 `read_plan_id` 本轮未使用。
- 如果源指纹缺失但文件存在，gate 使用 `verify_recommended`，要求使用前核验当前源。
- 该门禁不扩大文件读取权限，只把已下发的 compact reference 使用纪律变成可追踪证据。

## Claude Code 对照

- Claude Code compact 后不会盲目信任旧附件；过大的恢复内容会降级为 `compact_file_reference` 并提示必要时重新读取。
- CCM 本阶段对应的是：历史 read plan 一旦源漂移，就在下一次子 Agent 记忆包中强制提升为 revalidation gate。
- 这让第三方子 Agent 的新会话不只知道“有压缩引用”，还知道哪些引用必须先按当前文件重新验证。

## 验证

- 已通过：
  - `npm run check`
  - `npm run build:backend`
  - `runMemoryCenterCompactFileReferenceReadPlanRevalidationGateSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanFreshnessSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceReadPlanSelfTest`
  - `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
  - `runMemoryCenterGroupToolContinuitySnapshotSelfTest`
  - `runMemoryCenterGroupSessionMemorySnapshotSelfTest`
  - `runGroupCompactFileReferenceReadPlanSelfTest`
  - `npm run build:mcp-feishu`
  - `npm run build:frontend`
  - `npm run test:chat-experience`
