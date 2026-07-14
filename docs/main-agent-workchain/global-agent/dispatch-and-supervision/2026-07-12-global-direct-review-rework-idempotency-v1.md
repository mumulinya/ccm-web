# 全局单项目复核返工幂等修复 v1

## 问题

严格真实链验收发现两个相连问题：

- TestAgent 首轮拒绝后，原 Claude Code 会话虽然成功恢复，但第二轮如果仍未修好，监督器继续复用同一个 direct-review 幂等键，新的返工请求会被当成重复消息忽略。
- 初步按 followup 数量递增后，监督器轮询会把同一份 TestAgent 失败报告重复写成多条返工要求，提前耗尽自动尝试次数，并可能让全局 run 错误进入 `waiting_user`。

## 修复

- direct-review 自动尝试数改为按 TestAgent 真实失败报告轮次计算。
- 同一份失败报告在监督器轮询期间始终复用同一个幂等键。
- 只有 TestAgent 产生下一份失败报告时，才允许生成下一轮返工键。
- 返工工作单注入最新失败命令、验证缺口和复核摘要。
- 原实现成员被明确要求先真实重跑失败命令、阅读最新输出，再做最小修复；没有通过命令和可核验差异时不能提交完成结果。
- 真实链 E2E 增加“每份 TestAgent 失败报告最多对应一条 direct-review followup”断言。

## 用户可见行为

- 用户只看到一次清楚的“正在按 TestAgent 失败点返工”，不会每次轮询都新增相同进展。
- 返工仍复用原项目 Agent、原任务和原生会话。
- TestAgent 再次失败时系统会继续下一轮；达到真实失败轮次上限后才请求用户介入。
- TestAgent 通过后进入主 Agent 抽查和最终总结，不会因为旧的轮询 followup 多跑一轮。

## 验证

- `runDirectProjectReviewContinuationSelfTest()`：通过。
  - 同一失败报告即使存在 3 条历史 followup，也只计 1 次失败轮次。
  - 第二份失败报告正确推进到第 2 次。
  - TestAgent 失败证据会进入返工上下文。
- `runCoordinatorReworkProtocolSelfTest()`：通过。
- `runGlobalAgentLoopSelfTest()`：通过。
- `runGlobalMissionSupervisorAsyncSelfTest()`：通过。
- `npm run check`：通过。
- `npm run build:backend`：通过。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- `git diff --check`：通过，仅有工作区既有换行提示。

## 真实链现场

- 失败现场任务 `mrhewxotzjy9` 证明旧逻辑在第二次 TestAgent 拒绝后没有生成新返工。
- 修复中间现场任务 `mrhflns0xcj5` 证明失败证据能够让同一 Claude Code session 写入 `reviewRepairMarker`，TestAgent 复验和主 Agent 抽查均通过；同时也暴露了轮询重复 followup，促成本版按失败报告计数的最终修正。
- 最终无重复 followup 的全局真实返工链仍需在统一模型恢复后重新执行；未通过前不作为最终目标完成证据。

## 最终真实链补充

统一模型恢复后重新执行并通过：

- run：`gar_mrhglxad_80af003c`
- 任务：`mrhgmk9qqzwc`
- Trace：`global-agent-request_mrhglx9l_55a9906c2390`
- TestAgent 首轮：`needs_rework`
- 返工：复用唯一 Claude Code task session，`turnCount=2`，native session ID 保持不变
- 修复差异：`src/feature.js` 新增精确 `reviewRepairMarker`
- TestAgent 复验：通过
- 主 Agent 完成前抽查：通过
- direct-review followup：首轮失败只生成 1 条，轮询未重复追加
- 最终状态：任务 `done`，全局 run `completed`

真实链还发现并修复了单项目 `contractChanges` 自注入问题：回执中的变更现在自动绑定产生它的 Agent；无其他消费者时不要求把契约注入给自己，多项目与显式消费者同步规则保持有效。`runContractTransferPlanSelfTest()` 已覆盖单项目、多项目和未知显式消费者。

## 边界

- 未修改 `backend/test-agent/**`。
- TestAgent 内部执行仍由其独立维护链负责；本次只修复主 Agent 对失败结果的消费、返工调度和幂等控制。
