# 群聊主 Agent 接管计划卡可见性升级 v1

## 背景

群聊主 Agent 在接到项目任务时，后端已经会生成执行前计划、风险判断和确认状态。但即时 SSE 消息主要依赖 `taskRuntime.taskCard` 间接渲染，若 runtime 缺失或旧消息结构不完整，用户可能只看到接管文字和摘要，看不到类似 Claude Code 的执行前计划步骤。

## 本次升级

- 在群聊任务接管链路中显式写入 `planMode/plan_mode`、`taskCard/task_card` 和 `taskRuntime/task_runtime`。
- 前端 `GroupChat` 的任务卡读取逻辑优先兼容顶层 `taskCard/task_card`，再回退到 `taskRuntime.taskCard/task_card`。
- SSE `task_created` 即时消息也保存显式计划与任务卡字段，保证实时消息和历史消息渲染一致。
- 后续任务状态更新会同步刷新顶层 `taskCard/task_card`，避免接管时的计划卡压住后续进度卡。
- 计划模式下不再重复展示独立决策卡，用户主要看到一张清晰的执行前计划；底层决策与原始记录仍默认收在技术详情里。
- 新增真实渲染夹具：`ProjectTaskIntakeMessage + TaskCollaborationCard`，覆盖群聊接管消息外壳、等待确认摘要、执行前计划、执行步骤和确认按钮。
- Playwright 截图回归新增断言：普通问话不显示 Todo，群聊任务接管会显示执行前计划，技术详情默认折叠，原始协议不可见。

## 用户可见效果

用户在群聊里分派开发任务后，会先看到主 Agent 的友好接管说明，然后看到：

- 当前状态：等待确认或已入队。
- 主 Agent 对下一步的简短说明。
- 执行前计划：理解需求、只读探索、确认边界、派发子 Agent、验收并总结。
- 需要确认时的操作按钮。

普通聊天仍然不会展示 Todo 或任务计划卡。

## 验证项

- `scripts/main-agent-decision-ui-selftest.mjs` 增加群聊接管计划卡静态链路检查。
- `scripts/main-agent-render-regression.mjs` 增加群聊接管计划真实截图断言。
- 后续完整验证需运行自测、类型检查、后端构建、前端构建和截图回归。
