# Next Work Item Dispatch Action v1

## 背景

上一版已经让任务卡显示“下一步可派发”的已解锁工作项，但用户仍只能看见，不能直接让主 Agent 继续推进。对照 cc 的 Team/TaskList 链路，子任务完成后应该能立刻找出下一项并继续派发。

## 本次升级

- `TaskExperienceCard` 的“下一步可派发”工作项新增“继续派发”按钮。
- 群聊任务卡点击后调用 `/api/tasks/continue-from-gaps`。
- 请求会携带 `target`、`reason`、`rework_kind=next_claimable_work_item`，让后端生成精准续跑说明。
- 全局任务卡点击后，如果是全局 mission，会把已解锁工作项追加给监工目标；否则回到全局主 Agent 输入继续处理。
- 请求增加基于 task/work item 的幂等 key，减少重复点击造成的重复派发。

## 用户可见效果

- 用户能看到下一个已解锁工作项。
- 用户可以直接点击“继续派发”，让主 Agent 复用当前任务上下文推进。
- 技术上下文、Trace、work item id 仍隐藏在技术详情或请求载荷中。

## 验收覆盖

- `scripts/main-agent-decision-ui-selftest.mjs`
  - 守护任务卡存在 `continue_work_item` 动作。
  - 守护群聊和全局页面都接入这个动作。
- `scripts/main-agent-render-regression.mjs`
  - Playwright 真实渲染检查“继续派发”按钮可见。
