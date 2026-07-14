# 全局监督目标调整中断与重新规划 v1

日期：2026-07-10

## 问题背景

全局主 Agent 已能在任务派发后持续监督，但用户在监督阶段调整目标时，旧子任务可能继续执行，页面上的过程标题、Todo 和跨项目任务卡也可能保留旧状态。这会让用户无法确认旧方向是否真的停止，也会造成“正在重新规划”和“仍在协调旧目标”同时出现。

普通问话还必须保持独立会话语义，不能因为页面上存在一个监督任务就误更新旧任务或显示 Todo。

## 本轮目标

形成与 Claude Code 执行中 steering 相近的完整语义：

1. `supplement` 只补充当前任务，不撤销原目标和已有授权。
2. `revise_goal` 停止旧执行轮，撤销旧范围写入授权，并进入重新规划。
3. 用户立即看到新的 Todo、监督状态和下一步。
4. 技术统计、任务 ID 和原始接续数据继续默认折叠。
5. 普通问话继续创建普通新运行，不更新监督任务。

## 实现链路

### 目标调整

`/api/global-agent/runs/steer` 在运行处于 `supervising` 或 `paused` 且存在 supervisor 时：

1. 调用监督器 `update_goal`。
2. 对仍在执行的子任务发送带 `interrupt_current_run: true` 的接续请求。
3. 复用任务取消链路停止旧执行轮。
4. 保存受影响、重新排队、延后、中断和失败数量。
5. 将全局运行切换为 `phase=plan`、`supervision_state=replanning`。
6. 撤销旧目标范围的写入授权，要求按新目标重新规划。

用户可见文案为：

> 目标调整已接收。旧执行已停止，正在按新目标重新规划。

### 补充要求

`supplement` 保持当前目标边界和授权，更新执行目标后继续执行、验收和最终总结，不触发旧执行轮中断。

### 监督 Todo

目标调整后的用户可见计划固定为：

1. 重新核对目标和范围。
2. 停止旧执行轮。
3. 按新目标重新规划。
4. 重新执行验收和复核。

Todo 同步写入 run、workchain、display stream 和 main-agent decision，避免旧派发计划因读取优先级更高而覆盖新计划。

### Mission 即时同步

监督 steering 响应会同时返回最新 mission。前端立即更新当前消息中的 mission 和 supervisor，不等待下一次轮询。跨项目任务卡会根据 `collaboration_state.last_continuation.kind` 展示：

- `revise_goal`：正在按新目标重新规划；完成后会重新执行验收和复核。
- `supplement`：补充要求已同步，正在继续执行和验收。

### 重规划用户状态

目标调整进入重规划后，用户可见状态统一为：

- Mission 阶段：`重新规划中`。
- 处理方式：`目标调整`。
- 活跃 Todo 状态：`进行中`。
- 当前步骤：`正在按新目标重新规划`。
- 下一步：重新核对计划、继续派发，并重新执行 TestAgent 复核。

旧的“项目任务”“需确认”“正在修改”和“我正在协调各执行目标”不会与新状态同时出现。

### 历史同步去重

真实渲染回归运行超过历史同步周期后，发现 steering 会改变同一条运行消息的可见内容，而旧历史合并键包含消息内容。服务器稍后返回旧版本时，同一个 `run_id` 可能被误认为两条消息，页面同时出现新旧两张任务卡。

本轮将全局运行消息改为使用稳定身份合并：

1. 有消息 ID、运行 ID 或 mission ID 时使用稳定身份键。
2. 同一身份的多个版本按 `updated_at` 保留较新状态。
3. 旧纯文本历史仍可与后续结构化消息合并，保留已有兼容性。
4. 只有唯一匹配时才跨旧文本键和稳定身份键合并，避免不同运行被误合并。
5. 两个不同运行即使时间和用户可见文案完全相同，也不会因旧文本兼容逻辑被合并。

截图回归会在目标调整前后分别断言同一 `run_id` 只渲染一张任务卡。

## 用户展示边界

- 监督中的过程标题显示“持续跟进中”，不会显示“本轮过程已结束”。
- Todo 包含“验收”或“复核”时，不再错误提示“还缺验收步骤”。
- 普通问话按钮仍为“发送”，不会显示“更新任务”。
- 明确补充或目标调整时才显示“更新任务”。
- supervisor ID、mission ID、接续统计和原始控制数据只进入默认折叠的技术详情。

## 回归覆盖

真实 Playwright 截图用例覆盖：

- 普通问话不更新监督任务。
- 明确目标调整进入旧任务。
- 旧执行停止并进入重新规划。
- Todo 实时更新为 `2/4`。
- 监督标题保持“持续跟进中”。
- mission 任务卡同步显示重新规划。
- 技术详情默认折叠。
- 不显示错误验收提醒或原始 supervisor ID。
- 历史同步后同一运行仍只显示一张最新任务卡。

截图：`scratch/render-regression/07h-global-supervising-goal-revision.png`

整套渲染回归共 29 张截图。

## 最终验证

本轮改动完成时已通过：

- `npm run check`
- `npm run build:backend`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- 编译后的 `runGlobalAgentLoopSelfTest()`
- 编译后的 `runGlobalMissionSupervisorAsyncSelfTest()`
- 编译后的 `runCollaborationUxSelfTest()`
- `npm run test:post-review-spot-check`
- `npm run test:render-regression`
- `npm run test:replay-regression`
- `npm run test:code-changes`
- 局部 `git diff --check`

最终收尾时再次运行 `npm run check`，当前工作区被并行开发中的其他模块阻塞：

- `backend/test-agent/artifacts.ts`
- `backend/test-agent/result-builder.ts`
- `backend/modules/knowledge/memory-control-center.ts`

共 4 个类型错误，均不在本轮主 Agent 修改范围内。按并行分工，本轮没有修改或回退 `backend/test-agent/**`。前端生产构建、主 Agent 用户体验自测、历史去重测试、回放回归和 29 张真实渲染回归在该并行状态下仍再次通过。

人工复核 `07h-global-supervising-goal-revision.png`：

- 仅有一张统一任务卡。
- 显示“持续跟进中”“重新规划中”“处理方式：目标调整”“进行中”。
- Todo 为 `2/4`，下一步明确包含重新执行 TestAgent 复核。
- 不显示“项目任务”“需确认”“本轮过程已结束”“还缺验收步骤”。
- 技术详情默认折叠，无 supervisor ID 泄漏。
- 页面无明显遮挡、重复或裁切。
