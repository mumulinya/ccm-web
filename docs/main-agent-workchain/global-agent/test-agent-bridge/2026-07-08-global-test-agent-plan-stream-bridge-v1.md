# Global TestAgent Plan Stream Bridge V1

日期：2026-07-08

## 背景

TestAgent 业务流程由独立模块和另一个 Agent 继续维护。主 Agent 侧只负责连接稳定契约，并把用户需要知道的计划、受阻原因和后续动作展示出来。

群聊主 Agent 已经会在 TestAgent `--plan-only` 预检后发送 `test_agent_execution_plan_ready`。此前群聊任务卡能展示这份计划，但全局主 Agent 通过 `send_group_cmd` 派发后，没有把该事件桥接到全局流式消息里。

## 本次升级

- 全局主 Agent 调用群聊 SSE 接口时，边解析事件边筛出 `test_agent_execution_plan_ready`。
- 后端把该事件转换成全局 SSE 事件：
  - 用户可见 UI 只展示“TestAgent 复核计划”与中文状态。
  - 原始 plan、CLI 路径、dispatch 信息仍保留在结构化技术字段。
- 全局前端流式消息收到该事件后，会把 TestAgent plan 写入 `agenticRun`。
- 全局任务卡会立即展示：
  - TestAgent 复核计划
  - 可执行/需修复状态
  - 中文预检问题
  - 下一步动作
- 最终 `result` 到达时，会保留流式阶段已经收到的 TestAgent plan，避免任务卡闪现后丢失。

## 用户可见边界

用户主文本可以看到：

- “TestAgent 复核计划”
- “TestAgent 复核计划预检未通过”
- “缺少项目工作目录，请补齐 TestAgent 交接信息”
- “修复 TestAgent 工作单或项目路径后重新生成复核计划”

用户主文本不展示：

- `missing_work_dir`
- `report_json`
- `browser_har`
- 本地 artifact 路径
- handoff/work-order JSON

## 边界

- 未修改 `backend/test-agent` 的业务流程。
- TestAgent 继续负责 handoff 校验、work order 转换、plan 生成、验证执行、report、verdict 和 artifact。
- 主 Agent 只做事件桥接、状态同步、用户可读展示和技术详情归档。

## 验证

- 静态自测新增全局 TestAgent plan stream bridge 覆盖。
- 渲染回归新增全局流式 TestAgent 计划卡场景。
- 截图断言覆盖：
  - 全局流式任务卡能看到 TestAgent 计划。
  - 受阻状态显示为中文。
  - 原始 issue code、artifact 路径和 raw artifact label 不泄露到用户主文本。
