# 主 Agent 严格重新验收矩阵 v1

## 完成定义

只有群聊主 Agent 与全局主 Agent 都真实完成以下链路，长期目标才可以标记完成：

`用户需求 -> 澄清/计划 -> Todo -> 第三方代码 Agent 执行 -> TestAgent -> 主 Agent 抽查 -> 返工/复验（失败场景） -> 最终总结`

## 验收矩阵

| 编号 | 场景 | 当前证据 | 严格状态 |
| --- | --- | --- | --- |
| A1 | 普通问话不显示 Todo | 真实运行时任务存储前后为 0；生产 UI mapper 返回纯文本；截图 `01-simple-conversation-no-todo.png` | 通过 |
| A2 | 真实任务显示计划与实时 Todo | 生产组件截图 `02-task-plan-visible.png`、群聊与全局真实任务事件 | 通过 |
| A3 | 群聊主 Agent 真实派发代码 Agent | 任务 `mrhgr0tx7a16`，Claude Code 实际修改 `src/feature.js` | 通过 |
| A4 | 全局主 Agent 真实派发代码 Agent | run `gar_mrhglxad_80af003c`、任务 `mrhgmk9qqzwc` | 通过 |
| A5 | 群聊链路真实连接 TestAgent | `mrhgr0tx7a16` 持久化 TestAgent 计划、报告和结论 | 通过 |
| A6 | 全局链路真实连接 TestAgent | `mrhgmk9qqzwc` 持久化 TestAgent 首败、复验通过和主 Agent 抽查 | 通过 |
| A7 | TestAgent 失败触发返工与复验 | 注入失败后原 Claude Code session `turnCount=2`，写入 `reviewRepairMarker`；重复返工 followup 被抑制 | 通过 |
| A8 | 主 Agent 抽查后才允许完成 | 群聊、全局和可靠性任务均持久化完成前抽查证据 | 通过 |
| A9 | 群聊最终总结友好且技术详情折叠 | 群聊真实总结；截图 `03-technical-details-folded.png`、`09-child-agent-summary-expanded.png` | 通过 |
| A10 | 全局最终总结友好且技术详情折叠 | 全局 run 最终总结；全局生产组件截图与技术详情折叠断言 | 通过 |
| A11 | 执行中重启保持同任务 | 任务 `mrhguv7l51eu`、Trace `group_mrhguuxq_b536c463719c` 重启前后不变 | 通过 |
| A12 | SSE 断线与重复请求不重复副作用 | `mrhguv7l51eu` 主动断开、重启重发后任务数仍为 1，重复请求回放原任务 | 通过 |

## 最终结果

12 项严格门禁全部通过。完整证据汇总见 `2026-07-12-main-agent-complete-workchain-final-acceptance-v2.md`。

## 证据要求

每个真实任务必须记录：

- 用户请求与任务 ID。
- Trace ID、执行成员和第三方 Agent 类型（只写入技术证据）。
- 实际修改文件和差异摘要。
- 实际执行的验证命令及退出状态。
- TestAgent 工作单、最终结论和证据摘要。
- 主 Agent 抽查结果。
- 失败场景的返工任务、复验结果和状态变化。
- 用户可见 Todo 状态变化和最终总结。
- 重启或断线前后的任务、Trace 和副作用数量对比。

## 隔离要求

- 使用 `scratch` 下的专用 Git 项目，不修改用户业务仓库。
- 使用独立 CCM 主目录，不读取或写入用户现有任务、群聊与监督记录。
- 允许复用本机已配置的第三方 Agent 身份与统一模型配置，但不得把密钥写入日志或文档。
- 测试服务退出后清理临时主目录；保留脱敏验收报告和必要截图。
