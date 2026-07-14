# 主 Agent 与 TestAgent 操作效果、恢复和边界证据桥接 v1

日期：2026-07-10

## 本轮目标

在不修改 `backend/test-agent/**` 业务实现的前提下，让群聊主 Agent、全局主 Agent和最终工作链正确消费 TestAgent 新增的三类验收证据：

- 浏览器操作是否真正产生预期效果。
- 浏览器会话中断后是否完成安全恢复和复验。
- 边界或异常检查是否与当前目标、验收条件有效关联。

重点避免两类误判：

- 旧版顶层 `passed/canAccept` 覆盖新证据中的真实失败或缺口。
- 证据暂时不可观察、恢复未闭环时，错误要求原实现成员进行代码返工。

## 三条复核路线

### 实现返工

以下情况进入 `implementation_rework`：

- 页面操作没有产生可见效果。
- 与目标相关的边界或异常检查明确失败。
- 既有必检项、验收条件、真实浏览器流程、多人会话或登录态检查明确失败。

用户会看到具体失败场景、验收目标和下一步；主 Agent安排原实现成员修复后重新运行 TestAgent。

### TestAgent 复验

以下情况进入 `test_agent_recheck`：

- 操作效果暂时不可观察。
- 会话恢复失败，或为避免重复点击、重复提交而没有自动重试。
- 缺少与当前目标关联的边界或异常证据。
- 现有边界检查没有关联目标或验收条件。

这条路线只补证据、恢复会话或重跑复核，不直接要求原实现成员返工。

### 补齐执行条件

环境、登录或运行条件阻塞边界检查时进入 `environment`：

- 用户可见状态为“补条件”。
- 主 Agent先补齐环境、账号或运行条件，再继续 TestAgent 复核。
- 最终总结保持未完成，不会误报交付通过。

## 实现范围

### 共享桥接

`backend/agents/test-agent-review-bridge.ts` 提供并自测：

- `summarizeTestAgentBrowserActionEffects`
- `summarizeTestAgentBrowserRecovery`
- `summarizeTestAgentAdversarialEvidence`

摘要只保留用户可理解的场景、结果和下一步。provider、URL、session、原始事件、探针类型与报告路径仍保留在结构化技术数据中。

### 群聊主 Agent

`backend/modules/collaboration/collaboration.ts` 完成：

- 从 TestAgent 覆盖数组补建 `requiredCheckSummary` 和 `acceptanceSummary`。
- 新证据硬门优先于旧版 `passed/canAccept`。
- 有效裁决写入 `needsRecheck`、`needsEnvironment` 和 `reviewRoute`。
- 独立复核摘要最多显示 16 行，优先保留动作效果、恢复、边界证据和后续路线。
- 复验文案明确说明“这不代表实现失败”，避免误导为代码返工。

### 全局主 Agent

`backend/modules/global/global-agent.ts` 完成：

- 全局 TestAgent relay 消费三类新证据。
- 区分 `needs_rework`、`needs_recheck` 和环境受阻。
- 全局运行卡尊重实际 `run.phase`；复验中的运行显示“正在运行测试”，不再统一显示为“正在修改”。
- 旧版通过结论不能绕过新证据门禁。

### 最终工作链

`backend/agents/workchain.ts` 完成：

- 三类新证据进入独立复核质量门。
- 明确失败阻止最终完成并生成返工动作。
- 证据不完整生成复验动作，并明确不要直接要求原实现成员返工。
- 环境受阻要求先补条件。
- 最终用户总结不会把“需复验”改写成通用代码返工。

## 用户展示与隐私边界

群聊和全局任务卡会显示：

- 操作没有产生可见效果。
- 操作效果暂时不可观察。
- 会话恢复未闭环或未自动重试。
- 边界检查失败、缺失或未关联当前目标。
- 当前应返工、复验还是补齐条件。

默认折叠的技术详情承载：

- Playwright/provider 名称。
- 测试 URL、token 和报告路径。
- raw session id、恢复事件和底层原因。
- actionTypes、changedSignals 和探针类型。
- 原始 TestAgent 报告、裁决与 artifact 字段。

普通问话仍不显示 Todo、独立复核卡或技术详情。

## 回归保护

`scripts/main-agent-decision-ui-selftest.mjs` 新增静态断言：

- 三个共享摘要转换器存在并被群聊、全局和最终工作链消费。
- `needsRecheck`、`needsEnvironment`、`reviewRoute` 三路由存在。
- 自测覆盖操作效果返工/复验拆分、恢复不误返工、边界证据缺失重跑工作单。
- 全局任务卡尊重 `run.phase`。
- 真实渲染案例包含三类新证据，同时验证原始技术字段不进入主视图。

`scripts/main-agent-render-regression.mjs` 新增真实渲染断言：

- 全局复验卡显示“正在运行测试”。
- 操作不可观察、恢复未自动重试、边界证据缺失均可见。
- provider、URL、session、actionTypes、changedSignals、探针类型和底层恢复原因不可见。
- 技术详情默认折叠。

## 验证结果

已通过：

- `node scripts/main-agent-decision-ui-selftest.mjs`
  - 全部静态检查通过。
  - 新增 `testAgentActionRecoveryAdversarialEvidenceRoutes` 通过。
  - 新增 `testAgentLatestEvidenceRenderingAndPrivacy` 通过。
- `npm run test:render-regression`
  - 29 张真实 Playwright 截图全部通过。
  - 新增全局复验阶段断言通过。
- 人工查看：
  - `scratch/render-regression/02d-test-agent-failed-review-rework.png`
  - `scratch/render-regression/07d-global-test-agent-coverage-relay.png`
  - 页面无重叠，返工与复验路线清楚，技术详情默认折叠。

本轮此前已通过：

- 后端 TypeScript `--noEmit`
- 后端生产构建
- 前端生产构建
- `runTestAgentReviewBridgeSelfTest()`
- `runMainAgentWorkchainSelfTest()`
- `runCoordinatorReworkProtocolSelfTest()`
- `runCollaborationUxSelfTest()`
- `runGlobalAgentIntentSelfTest()`
- `npm run test:chat-experience`
- `npm run test:replay-regression`
- `npm run test:code-changes`
- `node scripts/main-agent-post-review-spot-check-selftest.mjs`

## 并行工作区边界

- 本轮没有修改 `backend/test-agent/**`。
- 该目录由另一个 Agent 并行维护，当前工作区中的相关改动全部保留。
- `npm run test:post-review-spot-check` 的前置全量编译当前受 `backend/test-agent/execution-plan.ts` 并行改动影响：`browserChecks` 类型暂缺 `concurrentRequests` 与 `concurrencyAssertionCount`。
- 主 Agent 抽查自测直接运行已通过；本轮不越权修改 TestAgent 所有者的文件。
