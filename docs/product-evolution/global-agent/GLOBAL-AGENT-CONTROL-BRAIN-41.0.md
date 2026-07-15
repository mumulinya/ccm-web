# 全局 Agent 总控大脑 41.0

本轮目标：按全局 Agent 的核心定位升级，而不是继续把它做成代码执行 Agent。全局 Agent 的职责是管理 CCM 系统、识别用户意图、调度群聊主 Agent / 项目 Agent、监督任务闭环和维护系统治理。

## 后端总控模块

新增 `backend/global-agent-control-center.ts`：

- `classifyGlobalControlIntent(message)`：把用户消息路由为系统健康、开发派发、任务监督、治理、系统管理、普通问答或歧义请求。
- `buildGlobalSystemHealth()`：汇总项目配置、群聊成员、任务队列、全局监工、定时任务、MCP / Skill。
- `buildGlobalDispatchStrategy(message)`：识别目标项目/群聊，给出 group main agent / global mission / direct project 的调度建议。
- `buildGlobalGovernanceSnapshot()`：汇总全局 Agent 工具定义、权限规则、Hook 规则和高风险工具。
- `buildGlobalSupervisionDashboard()`：输出全局任务监工队列，标记等待人工、失败/取消等状态。
- `runGlobalControlCenterSelfTest()`：覆盖意图路由、健康异常识别、调度目标识别和治理工具存在性。

## 新增 API

`backend/modules/global-agent.ts` 新增：

- `GET /api/global-agent/control-center?message=...`
- `GET /api/global-agent/control-center/intent-preview?message=...`
- `GET /api/global-agent/control-center/health`
- `GET /api/global-agent/control-center/self-test`

这些 API 不直接执行用户请求，只为全局 Agent 总控面板和 dry-run 预览提供系统级判断。

## 前端总控面板

`frontend/src/components/GlobalAgent.vue` 新增“总控面板”：

- 顶部展示健康评分、意图路由、监工队列、治理规则数量。
- 支持输入一句话预览全局 Agent 会如何路由和调度。
- 系统健康区展示项目、群聊、任务、监工、cron、MCP / Skill 状态。
- 意图与调度区展示推荐工具、路由原因、目标项目/群聊或缺失项。
- 权限治理区可新增/删除 allow/deny 规则。
- Hook 治理区可新增/删除 pre/post tool use Hook。
- 任务监督控制台支持 check_now、pause、resume、takeover。

## 设计边界

全局 Agent 仍不直接承担项目代码执行职责：

- 开发落地由全局 Agent 创建 mission 或派发给群聊主 Agent / 项目 Agent。
- 全局 Agent 负责路由、授权、监督、审计、恢复和最终解释。
- 高风险系统管理继续走权限与确认链路。

## 验证

已执行：

```powershell
npm run check
```

发布前建议继续执行：

```powershell
npm run build
node -e "const m=require('./ccm-package/dist/global-agent-control-center.js'); const r=m.runGlobalControlCenterSelfTest(); console.log(r); if(!r.pass) process.exit(1)"
```
