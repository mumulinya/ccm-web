# TestAgent 开关与主 Agent 自验

## 用户设置

设置中心新增“TestAgent”页面。全局开关默认开启，统一作用于群聊和项目自动开发的新任务。

页面说明 TestAgent 的职责、开启后的独立验收流程、关闭后的主 Agent 自验流程，以及关闭独立验收带来的风险。

## 开启模式

```text
开发 Agent完成工作项
→ TestAgent独立读取目标、源码变化和真实验证证据
→ 通过后交给主 Agent最终验收
→ 失败时主 Agent生成返工单并最多复验三轮
```

## 关闭模式

```text
开发 Agent完成工作项
→ 不启动 TestAgent
→ 对应项目或群聊主 Agent只执行一轮自验
→ 证据充分则交付
→ 证据不足或验证失败则阻止交付并请求用户处理
```

关闭模式不会把主 Agent自验伪装为独立验收。任务保存 `acceptance_mode=main_agent_self_verification`，时间线使用“主 Agent自验”事件，交付记录中的 TestAgent 字段保持为空。

摘要任务卡、一级详情、返工提示、验收轮次和任务回放都读取任务自身固化的 `acceptance_mode`。开启时阶段为 `TestAgent（独立验收）`，关闭时阶段为 `主 Agent自验`；同一任务在刷新或断线恢复后不会因为当前设置变化而改写历史验收角色。全局 Agent页面只显示正在跟踪或汇总下游验收，不声称由全局 Agent直接执行TestAgent或自验。

## 状态与接口

- 设置文件：`configs/test-agent-settings.json`
- `GET /api/system/test-agent`
- `POST /api/system/test-agent`
- 默认值：`enabled=true`
- 设置在任务进入验收链时固化到 `test_agent_enabled` 与 `acceptance_mode`。

## 安全边界

- 关闭 TestAgent 不会关闭开发 Agent 的结构化回执、文件变更检查和已执行验证证据门禁。
- 主 Agent自验模型不可用时 fail closed。
- 主 Agent自验只运行一轮，不进入 TestAgent 增量复验或三轮返工循环。
- 已经进入验收阶段的任务使用自身固化的模式，不因页面瞬时切换而混用两套结论。
