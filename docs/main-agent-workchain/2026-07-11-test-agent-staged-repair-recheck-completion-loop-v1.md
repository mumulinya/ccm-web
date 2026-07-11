# TestAgent 阶段化返工、复验与完成闭环 v1

日期：2026-07-11

## 本轮目标

补齐主 Agent 完整链路中的一个真实断点：TestAgent 返回失败、需复验或补条件后，系统过去最多只允许一次自动后续，无法稳定完成以下链路：

1. 原实现成员返工或补齐复核条件。
2. 主 Agent 自动重新运行 TestAgent。
3. 使用最新复核结论完成最终验收和总结。

本轮参考 `D:\claude-code` 的 Agentic Loop、Stop Hook 恢复和任务验证推动机制，把一次性返工改成有状态、有限次数、可验证的三阶段闭环。

## 旧链路问题

原协调复盘最多执行两轮，并且最后一轮禁止继续派发，因此实际只能完成一次自动动作：

- TestAgent 失败后可以派原实现成员返工，但返工完成后不能自动重新运行 TestAgent。
- TestAgent 缺环境时可以提示补条件，但补齐后不能自动复验。
- TestAgent 返回 `needs_recheck` 时，通用回执规则可能把它当成普通 blocked Worker，丢失原复核工作单。
- 旧失败和新通过同时存在时，旧失败仍可能阻止最终验收。
- LLM 生成的泛化后续可能与硬门禁路线同时派发，造成重复或方向冲突。

这些问题会让用户看到“下一步应该复验”，但系统并没有真的继续执行。

## 新的三阶段循环

协调复盘上限调整为三阶段：

1. 修复或准备阶段
   - 明确实现失败：回到原实现成员返工。
   - 环境、登录或运行条件不足：交给原项目补齐复核条件，不误判为业务代码返工。
2. TestAgent 复验阶段
   - 返工或条件准备成功后，自动排入 TestAgent。
   - 优先沿用原 `ccm-test-agent-handoff-v1` 工作单、验收标准和项目配置。
   - 没有可复用工作单时，重新生成独立复核交接单。
3. 最终验收阶段
   - 最新 TestAgent 结论覆盖同一复核方、同一复核对象的旧结论。
   - 通过后进入最终总结。
   - 仍失败或仍受阻时停止自动派发，向用户说明剩余缺口，避免无限循环。

## 路由规则

### 实现失败

`test_agent_failed_review_rework`：

- 路由到原实现成员。
- 复用原 Worker 上下文和失败证据。
- 返工完成后自动生成 `test_agent_review_recheck`。
- 不会因为工作单中写了“返工后重跑 TestAgent”而提前跳过当前返工。

### 证据需复验

`test_agent_review_recheck`：

- 有原 handoff 时使用 `resume_verifier / same_verifier_context`。
- 沿用原目标、验收标准、浏览器配置和验证边界。
- 强制基于最新文件、最新环境和最新真实输出重新判断，不能复用上一轮结论。
- 没有 handoff 时使用新的独立验证 Agent 生成工作单。

### 环境或登录条件不足

`test_agent_environment_prepare`：

- 路由为 `prepare_verification_environment`。
- 原项目只补齐服务、账号、登录或运行条件。
- 用户文案明确这不是业务实现返工。
- 条件准备返回 done 后，自动沿用原工作单重新运行 TestAgent。

## 最新证据优先

独立复核证据现在按“复核方 + 复核对象”保留最新一条：

- 同一个 TestAgent 对同一个项目先失败、返工后通过时，只使用最新通过结论。
- 不再把同一份 TestAgent 回执重复记录成“结构化独立复核”和“普通验证 Agent 回执”。
- 原始 TestAgent JSON 会在协调后端中保留 handoff、verdict 和技术字段，但不会进入用户主视图。

## 硬门禁与 LLM 后续仲裁

TestAgent 门禁生成的路线优先于 LLM 泛化建议：

- 硬门禁要求回原实现成员返工时，不会同时再派一个泛化复核任务。
- 已排入 TestAgent 复验时，不会重复派另一个 TestAgent 或再次要求原项目返工。
- 与当前复核对象无关的独立任务仍可保留。

这样既保留 LLM 协调能力，也保证验收状态机不会被自然语言建议改写。

## 群聊与全局主 Agent

群聊主 Agent 直接执行阶段化循环，并通过 SSE、任务时间线、工作项和复核摘要持续更新用户可见状态。

全局主 Agent 派发到群聊或持续监管全局任务时，读取同一份群聊任务状态、TestAgent relay 和最终工作链，因此会同步得到：

- 返工中的真实状态。
- 自动 TestAgent 复验状态。
- 最新独立复核结论。
- 完成前抽查与最终总结门禁。

普通问话仍不会创建 Todo 或触发 TestAgent。

## 用户可见文案

失败卡现在明确显示：

> 把失败检查项带回给原实现成员返工；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。

用户主视图不显示：

- `reviewRoute`、`needsRecheck`、`needsEnvironment`。
- handoff JSON、work order id、provider、session、URL 和报告路径。
- `CCM_AGENT_RECEIPT`、内部路由名和调度协议。

这些内容继续保留在默认折叠的技术详情中。

## 回归保护

`runCoordinatorReworkProtocolSelfTest()` 新增覆盖：

- 三阶段循环允许“返工 -> TestAgent -> 最终验收”。
- 结构化 TestAgent 回执不会进入普通 Worker 补证据规则。
- `needs_recheck` 复用原 TestAgent handoff。
- `needs_environment` 先补条件再自动复验。
- 实现返工成功后自动生成 TestAgent 复验工作单。
- 最新 TestAgent 通过结论覆盖旧失败。
- 硬门禁压制同一复核对象的冲突 LLM 后续。

`scripts/main-agent-decision-ui-selftest.mjs` 新增 `testAgentStagedRepairRecheckCompletionLoop` 静态约束。

`scripts/main-agent-render-regression.mjs` 验证群聊和全局失败卡都显示自动复验文案，并继续检查技术详情默认折叠和内部字段不可见。

## 验证结果

已通过：

- 后端 TypeScript 类型检查。
- 后端运行包发射。
- `runCoordinatorReworkProtocolSelfTest()`。
- `runCollaborationUxSelfTest()`。
- `runGlobalAgentIntentSelfTest()`。
- `node scripts/main-agent-decision-ui-selftest.mjs`。
- `npm run test:render-regression`。
  - 29 张真实 Playwright 截图全部通过。
  - 群聊失败卡和全局流式失败卡均显示自动复验动作。
  - 技术详情默认折叠。
- 人工检查 `scratch/render-regression/02d-test-agent-failed-review-rework.png`：页面无重叠，文案完整，内部协议未泄漏。

## 并行工作区边界

- 本轮没有修改 `backend/test-agent/**`。
- TestAgent 业务实现继续由并行 Agent 维护。
- 本轮只消费 TestAgent 已提供的报告、裁决、handoff 和可见摘要。
- 代码暂不提交，等待用户要求统一提交。
