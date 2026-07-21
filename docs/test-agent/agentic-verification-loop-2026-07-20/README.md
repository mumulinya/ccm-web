# TestAgent 智能验证循环

## 目标

让 TestAgent 真正具备“读当前代码 -> 决定检查 -> 运行命令/Playwright -> 收集证据 -> 独立验收”的能力，而不是只增加实时过程展示。

## 实现

- 新增 `backend/test-agent/agentic-planner.ts`。
- 智能规划读取变更文件、相关源码片段、项目文件清单、`package.json` scripts、目标 URL 和验收标准。
- 支持模型生成结构化 verification commands、HTTP checks 和 browser checks。
- 模型计划重新进入 `normalizeTestAgentWorkOrder()`，复用现有命令、路径、URL、生产环境和浏览器动作安全校验。
- 危险命令通过 `isUnsafeVerificationCommand()` 在合并前剔除，命令执行器仍会进行第二次阻断。
- 规划结果写入 TestAgent report metadata，记录读取文件、增加的检查、只读边界和最终裁决来源。
- 模型不可用时记录 `agentic_test_planning_degraded`，继续执行确定性计划。
- 首轮出现失败、阻断或无证据时允许一次模型复核，最多补充 3 条安全命令；已执行命令不会重复，复核不能覆盖原失败证据。
- 群聊正式 TestAgent 工作单默认启用；其他入口必须显式开启。

## 独立性

TestAgent 不具备文件编辑工具。它不能修改产品代码或测试来“修好”失败，只能把失败证据和返工建议交回群聊主 Agent。最终 `accept/rework/need_human` 仍由现有 report/verdict/manifest 证据链决定。

## 验证

- mock 模型读取真实临时变更源码和 `package.json` 脚本。
- 安全命令被实际执行并通过。
- 首轮失败后能够选择并执行一条新的聚焦验证命令，且不重复失败命令。
- `npm install` 类变更命令在执行前被拒绝。
- 智能规划证据进入正式 TestAgent report。
- 测试付费 Provider 调用为 0。
