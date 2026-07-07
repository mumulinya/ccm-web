# CCM Group Memory CC Parity Phase 7

日期：2026-07-07

## 本次目标

补齐 PTL emergency 的恢复闭环。Phase 4 已经实现了高压时进入 PTL 紧急降级，但如果压力下降后仍长期携带 `ptlEmergency` 元数据，子 Agent 会持续误判当前上下文仍处于紧急短摘要状态。

本阶段新增 `ptlRecovery`，让 CCM 能在压力回到安全区间后恢复普通摘要预算，并把恢复事实写入可审计元数据。

## 已实现

- `backend/modules/collaboration/group-memory-compaction.ts`
  - 新增 `GROUP_PTL_RECOVERY_VERSION`。
  - 新增 `buildGroupPtlRecoveryPlan()`。
  - `compactGroupConversationMemory()` 在新一轮压缩中：
    - 如果上一轮有 `ptlEmergency.engaged`。
    - 当前没有再次触发 PTL emergency。
    - `contextBudget.pressure` 和 `postCompactTokenCount / triggerTokens` 回到安全阈值。
    - 则写入 `ptlRecovery`，清除 active `ptlEmergency`。
- `backend/modules/collaboration/memory.ts`
  - `refreshGroupConversationMemorySnapshot()` 在构建子 Agent 记忆包前也会执行 PTL 恢复判断。
  - 恢复后 `messageDigest` 使用普通 14k 字符预算。
  - 未恢复时继续使用上一轮 emergency 的短摘要预算。
  - 子 Agent 受控记忆包新增 `compaction.ptlRecovery`。
  - 渲染文本新增 “PTL 自动恢复”。

## 恢复元数据

`ptlRecovery` 记录：

- schema/version
- previous emergency level/reason
- previous emergency digest budget
- restored digest budget
- post compact token ratio
- context budget pressure
- pressure/ratio threshold
- summary checksum
- raw transcript path
- recoveredAt

## 安全边界

- PTL recovery 不删除原始 transcript。
- PTL recovery 只清除 active emergency 状态，不删除历史 boundary。
- 如果当前压力仍高，`ptlEmergency` 保持 active，摘要继续使用短预算。
- 可以通过 config 强制恢复：`ptlRecover` / `ptlRecovery` / `groupPtlRecovery`。

## 新增自测

- `runGroupMemoryPtlRecoverySelfTest()`
  - 验证 emergency -> recovery。
  - 验证 active `ptlEmergency` 被清除。
  - 验证 `health` 恢复为 `healthy`。
  - 验证摘要预算大于之前 emergency budget。
  - 验证 `context_budget.ptl_recovery` 写入。
  - 验证 sentinel 仍在摘要中。
- 更新 `runGroupTypedMemoryContextSelfTest()`
  - 验证构建子 Agent 记忆包时可以自动恢复 PTL。
  - 验证渲染文本出现 “PTL 自动恢复”。

## 后续增强方向

- 蒸馏质量评分：对 `distilled-log-*.md` 执行 stale path / contradiction / coverage 检查。
- 稀疏 active window：让 sidecar partial segments 能参与上下文窗口裁剪。
- 完整 completion audit：逐项核验长期目标所有能力是否已被当前代码和测试覆盖。
