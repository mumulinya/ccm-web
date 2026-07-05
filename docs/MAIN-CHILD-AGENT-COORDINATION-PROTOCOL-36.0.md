# 主 Agent ↔ 子 Agent 协作协议 6.3

目标：把 ACK 和 `contractChanges` 从展示/评分提升为 daily_dev 完成门禁，并让契约变化自动进入依赖 Agent 的续跑说明。

## 1. ACK 真正前置阻塞

daily_dev 任务只要要求代码变更或验证，就必须通过 ACK gate：

- `ack_gate_passed !== true` 时，`canCompleteDailyDevFromDeliverySummary()` 拒绝完成。
- 手动把 daily_dev 改成 `done` 时，`validateTaskManualStatusUpdate()` 会拦截并提示缺少 `ACK 前置审核通过`。
- `buildAcceptanceGate()` 新增 `ack_gate` / `ACK 前置审核` 检查，任务卡验收区可看到失败项。
- ACK 缺失、`weak`、`needs_rewrite` 或 `waiting` 会进入 `getTaskGapItems()`，触发缺口续跑。

ACK 返工说明会要求目标子 Agent 只先重写接单 ACK，并包含：

- `understoodGoal`
- `plannedScope`
- `forbiddenScope`
- `verificationPlan`
- `unclear`

ACK 未通过前，主 Agent 不允许宣布 daily_dev 完成。

## 2. contractChanges 自动注入依赖 Agent

子 Agent 回执中的结构化 `contractChanges` 会被 `extractContractSyncHints()` 识别。每条变化可通过 `consumers` / `consumer` / `dependents` 指定消费者 Agent。

系统随后生成 `contract_transfer` 和 `contract_injection_gate`：

- `not_required`：没有检测到跨 Agent 契约变化。
- `needs_contract_changes`：检测到接口/字段/schema 风险，但缺少结构化 `contractChanges`。
- `needs_injection`：已识别消费者，但尚未看到依赖 Agent 的契约注入续跑证据。
- `injected`：依赖 Agent 已收到明确的 contract injection / contractChanges 续跑说明，或说明中命中了对应 endpoint/type。

注入判断不会把普通的“改 API 调用”误认为已注入；必须出现明确的 contract injection / contractChanges / 契约注入文本，或命中具体 endpoint/type。

## 3. 缺口续跑与会话复用

当 `contract_injection_gate` 未通过时，缺口续跑会自动生成面向消费者 Agent 的说明：

- 指定目标消费者 Agent。
- 注入 endpoint/type 和变化摘要。
- 要求依赖 Agent 判断是否需要适配代码、完成适配和验证。
- 要求回执保留 contractChanges 消费结论。
- 明确优先复用原任务、原 Trace、原 native session / scratchpad。

自动驾驶、看门狗和任务卡的“按缺口返工”都会通过同一任务卡继续，不新建无关任务；相同缺口自动返工一次后若没有新证据，会转为需要用户介入。

## 4. 任务卡展示

任务卡协作区展示：

- ACK 审核行和失败原因。
- 契约同步摘要。
- contract injection gate 摘要。
- 每个消费者的 `待注入` / `已注入` / `待确认目标` 状态。
- 只对未注入的消费者显示 `contract_inject` 精准返工动作。
- 验收门禁中的 `ACK 前置审核` 与 `契约注入依赖 Agent` 状态。

## 5. 自测与验证覆盖

`runCollaborationUxSelfTest()` 覆盖：

- ACK gate 失败会阻止 daily_dev 完成。
- ACK 缺失/weak 会生成 ACK 重写返工说明。
- 结构化 `contractChanges.consumers` 会生成依赖 Agent 注入缺口。
- 明确的 contract injection 续跑会通过 gate。
- 普通 API 原始任务不会被误判为 contract injection。
- 任务卡仍展示 ACK gate、contract transfer 和 contract injection 精准返工动作。

构建验证：

- `npm run check`
- `npm run build`
