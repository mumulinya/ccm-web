# CCM Agent 角色 Skill 接入记录

日期：2026-07-14

## 目标

为全局 Agent、群聊主 Agent、项目子 Agent 和 TestAgent 提供与职责匹配的 Skill，同时保留 CCM 现有状态机、权限、Todo、派发、重试和验收门禁作为系统级真相。普通问话不加载工作 Skill，项目 Agent 的用户授权 Skill 继续保留。

## Skill 分层

| Skill | 使用角色 | 责任 |
| --- | --- | --- |
| `ccm-global-mission-lead` | 全局 Agent | 跨群聊路由、监督、最终用户总结 |
| `ccm-group-coordination-lead` | 群聊主 Agent | 计划、拆分、派发、回执复核、返工和 TestAgent 交接 |
| `ccm-project-delivery-worker` | 项目子 Agent | 在项目边界内研究、实现、验证和交付 |
| `ccm-test-acceptance-verifier` | TestAgent | 独立命令、API、浏览器与截图验收 |
| `ccm-delivery-receipt` | 群聊主 Agent、项目子 Agent | 统一结构化交付回执 |
| `ccm-acceptance-evidence` | 按任务动态选择、TestAgent 必选 | 验收标准与真实证据绑定 |

后续新增的 8 个工作流 Skill、阶段选择规则和第三方运行时验证见 `2026-07-14-agent-workflow-skills-and-prompt-slimming.md`。

## 选择规则

- 全局 Agent 和群聊主 Agent：只有明确执行请求或可信任务来源才加载角色 Skill；问候、知识问答、项目介绍和方案咨询返回空选择。
- 项目子 Agent：始终加载 Worker 与交付回执 Skill；任务包含测试、构建、API、页面、浏览器、截图或验收要求时追加验收证据 Skill。
- TestAgent：固定加载独立验收与验收证据 Skill，并把选择写入真实 work order 元数据。
- 全局、群聊主 Agent 和 TestAgent 默认最多注入 4 个 Skill，项目子 Agent 默认最多 6 个；按角色、阶段和任务语义选择，不全量灌入提示词。
- 项目和群聊里用户配置的 MCP/Skill 与系统角色 Skill 合并，不被覆盖。

## 实现位置

- Skill 模板：`ccm-package/templates/skills/ccm-*`
- 安装、选择与提示词预算：`backend/skills/role-skills.ts`
- 全局 Agent：`backend/agents/global/loop.ts`
- 群聊主 Agent：`backend/modules/collaboration/group-orchestrator.ts`
- 项目第三方 Agent：`backend/modules/collaboration/collaboration.ts`
- TestAgent：`backend/test-agent/agent-profile.ts`、`backend/test-agent/agent.ts`
- 启动安装：`backend/server.ts`

## 验证标准

运行 `npm run test:role-skills` 必须证明：

1. 普通全局/群聊问话不选择工作 Skill。
2. 四个角色只获得对应基础 Skill，共享 Skill 按任务追加。
3. 14 个官方 Skill 包和 `agents/openai.yaml` 已安装到 CCM 托管目录。
4. Claude Code、Cursor、Codex 的隔离运行时快照按文档/UI、故障、发布场景同步所有项目执行相关 Skill，且无缺失项。
5. TestAgent profile 明确包含独立验收与验收证据 Skill。

机器报告输出到 `scratch/role-skills-selftest/report.json`。生产重启后还需检查 `~/.cc-connect/skills`、`~/.cc-connect/skill-packages` 和真实运行时快照。
