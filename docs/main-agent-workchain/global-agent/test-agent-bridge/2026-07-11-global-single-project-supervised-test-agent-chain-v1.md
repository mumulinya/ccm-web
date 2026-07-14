# 全局单项目持续监督与 TestAgent 闭环 v1

日期：2026-07-11

## 目标

补齐全局主 Agent 直接派发单个项目时的完整工作链：

`用户需求 -> 可见计划 -> 单项目持久任务 -> 项目 Agent 执行 -> TestAgent 独立复核 -> 主 Agent 抽查 -> 返工/复验/补条件 -> 最终总结`

普通问话仍不展示 Todo；面向用户只展示目标、进度、复核结论和下一步，Trace、原始工作单、CLI 输出与证据路径默认放在折叠的技术详情中。

## 原问题

- `send_project_cmd` 原来同步调用 `/api/send`，项目 Agent 一返回就结束当前工具动作。
- 这条路径没有持久任务、持续监督、自动返工和最终完成通知。
- 全局任务虽支持单项目子任务，但项目直执行分支没有自动启动原生 TestAgent。
- 复杂变更会停在独立复核门禁前，或者依赖项目 Agent 自报验证，不能形成可靠交付闭环。

## 对照 Claude Code

参考 `D:\claude-code\src\constants\prompts.ts` 的完成契约：非平凡实现完成后必须由独立验证器复核；失败时修复并复验；验证通过后主 Agent 还要抽查关键命令。参考 `TaskUpdate` / `TodoWrite` 约束，只有真正完成时才能标记完成，计划状态应随执行逐步更新。

本次没有复制 Claude Code 的界面或内部实现，而是把这些约束接入 CCM 已有的全局任务、监督器、TestAgent 和任务卡模型。

## 实现

### 1. 单项目入口统一为持久任务

- `send_project_cmd` 保留工具名，但语义改为“创建受持续监督的单项目任务”。
- Web 全局 Agent 和飞书入口都进入 `/api/global-agent/orchestrate` 或同等内部任务创建逻辑。
- 自动创建单目标全局任务、子任务和 supervisor；派发成功只表示进入任务链，不表示完成。
- 工作单强制要求项目验证、独立复核和完成前抽查。

### 2. 项目直执行后自动独立复核

- 项目 Agent 仍可使用 Claude Code、Cursor 等第三方写代码 Agent。
- 项目 Agent 提交结构化结果说明后，主 Agent 生成 `ccm-test-agent-handoff-v1`。
- TestAgent 先生成执行计划，再运行真实复核。
- TestAgent 通过后，主 Agent 重跑最多 3 条关键验证做完成前抽查。
- TestAgent 绑定本轮真实执行目录，包括隔离 worktree，避免在基础目录复核不到尚未合并的改动。

### 3. 四条后续路由

- `needs_rework`：返回原项目 Agent 修复失败点，完成后重跑 TestAgent。
- `needs_recheck`：保留已完成实现，只沿用同一复核目标重跑 TestAgent，不重复改代码。
- `needs_environment`：先补运行、登录或环境条件，再自动复验。
- `needs_user`：明确等待用户补充信息，不把阻塞写成完成。

监督器按上述路由自动续跑，并受最大尝试次数限制；所有验收门禁通过后才生成最终总结。

### 4. 用户可见展示

- 全局单项目卡显示“持续跟进”，不再误写成“正在修改”。
- 下一步明确显示“等待项目执行结果；随后运行 TestAgent 独立复核和完成前抽查”。
- 派发区显示目标项目和“已进入持续监督”。
- 原始 TestAgent 工作单、Trace、路径和 raw payload 不进入主文本。

## 验证

- 后端 TypeScript `--noEmit`：通过。
- 后端生产构建：通过。
- 前端生产构建：通过。
- `runCoordinatorReworkProtocolSelfTest()`：通过，覆盖四条单项目复核路由。
- `runGlobalAgentIntentSelfTest()`：通过，覆盖单项目持久任务与验收要求。
- `node scripts/main-agent-decision-ui-selftest.mjs`：通过。
- Playwright 渲染回归：30 张截图全部通过。
- 新截图：`scratch/render-regression/07i-global-single-project-supervision.png`。
- 人工查看新截图：状态、下一步、目标项目和技术详情折叠均正确，无重叠和内部字段泄漏。

## 边界

- 本轮没有修改 `backend/test-agent/**`；该目录继续由负责 TestAgent 的并行 Agent 维护。
- 本轮不提交代码，等待长期目标后续阶段统一提交。
