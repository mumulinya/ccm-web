# CCM Agent 工作流 Skill 与真实使用接入

日期：2026-07-14

## 目标

将重复且冗长的工作方法从全局 Agent、群聊主 Agent、项目子 Agent 和 TestAgent 的固定提示词中拆成可复用 Skill，并确保 Skill 会在真实任务里被选择、注入、同步、执行和记录。权限、Todo、状态机、重试、JSON 协议、运行时授权和验收门禁继续由系统代码负责。

## 新增工作流 Skill

| Skill | 触发场景 | 主要使用者 |
| --- | --- | --- |
| `ccm-requirement-intake` | 消息、图片、附件、PRD、接口说明需要转成可执行需求 | 全局 Agent、群聊主 Agent |
| `ccm-task-decomposition` | 明确任务需要拆成项目工作单和语义依赖 | 群聊主 Agent |
| `ccm-delivery-review-rework` | 子 Agent 回执复核、缺口识别和返工 | 群聊主 Agent |
| `ccm-project-source-research` | 实施前读取当前源码、规范和工作区状态 | 项目子 Agent |
| `ccm-document-driven-delivery` | PRD、API、文档或附件条款需要实现追踪 | 全局、群聊和项目 Agent |
| `ccm-incident-diagnosis` | 400/500、异常、超时、构建或运行失败 | 全局、群聊和项目 Agent |
| `ccm-frontend-visual-qa` | 页面、布局、交互、响应式和截图验收 | 项目子 Agent、TestAgent |
| `ccm-release-readiness` | 版本、升级、迁移、部署、上线和回滚 | 全局、群聊、项目和 TestAgent |

加上原有 6 个角色/共享 Skill，系统共托管 14 个 `ccm-*` Skill。

## 真实使用链路

1. `selectRoleSkills()` 根据 Agent 角色、任务阶段和当前任务文本选择 Skill；普通问话返回空数组。
2. 全局 Agent 和群聊主 Agent 通过 `buildRoleSkillPrompt()` 只注入当轮匹配的 Skill 正文。
3. 项目子 Agent 将系统 Skill 与群聊/项目授权 Skill 合并，运行前同步到 Claude Code、Cursor 或 Codex 的隔离运行时目录。
4. 项目工作单前置 `buildSelectedSkillUsageDirective()`，明确要求读取并应用 `SKILL.md`，并在 `CCM_AGENT_RECEIPT` 中逐项报告实际使用情况；未使用必须说明原因。
5. `attachInvokedSkillsToReceipt()` 只从第三方 Agent 的真实输出和结果说明识别授权范围内的 `Skill:<name>`，将其写入 `invokedSkills`、运行时审计、执行记录和任务回放；未授权名称不会被记为已使用。
6. TestAgent 由原生引擎直接应用所选 Skill，工作单元数据记录 `phase=verification`、`applied=true` 和 `appliedBy=ccm-native-test-agent-engine`。
7. 服务启动时 `ensureRoleSkillsInstalled()` 将模板同步到托管包目录与 Skill 目录，并保持启用状态。

## 阶段选择

- 全局 Agent：跨群聊任务角色 Skill，加需求提炼、文档、故障或发布 Skill。
- 群聊规划：协调角色 Skill、任务拆解，并按需增加需求、文档、故障或发布 Skill。
- 群聊复核/总结：协调角色 Skill、交付复核、回执读取，并按需增加验收证据 Skill。
- 项目执行：项目交付、源码研究和交付回执必选，再按需增加文档、故障、视觉、证据和发布 Skill。
- TestAgent：独立验收和验收证据必选，UI 任务增加视觉验收，发布任务增加发布就绪。

项目 Agent 默认最多 6 个，其余角色默认最多 4 个，避免把全部 Skill 固定塞入上下文。系统门禁和动态 Skill 可以同时生效，不以 Skill 替代授权或状态机。

## 提示词瘦身

- 群聊规划提示词删除重复的需求提炼、任务拆解、文档条款映射和返工方法，只保留角色权限、当前消息授权、动作边界、知识边界和 JSON Schema。
- 群聊复核提示词删除重复的回执审查与返工写法，只保留最新任务门禁、内部协议解析和输出 Schema。
- TestAgent 删除固定提示词中的超长浏览器操作手册，改由验收与视觉 Skill 提供方法；稳定执行身份、超时、副作用、防伪证据和权限边界仍在系统层。

## 验证结果

`npm run test:role-skills` 生成 `scratch/role-skills-selftest/report.json`，本次结果：

- 选择器全部断言通过，普通全局/群聊问话均不加载工作 Skill。
- 14 个 Skill 的 `SKILL.md`、`agents/openai.yaml` 和托管元数据均存在。
- 原生全局、群聊规划、群聊复核和 TestAgent 提示词包含对应 Skill 正文。
- Claude Code、Cursor、Codex 分别完成文档/UI、故障、发布三类运行时同步；每个运行时覆盖 8 个项目执行相关 Skill，所有快照均 `requested == synced`、`missing=[]`。
- 三种运行时的每个场景均能从结果说明识别全部已授权 Skill 使用声明，并拒绝记录未授权 Skill。
- 真实 TestAgent 命令探针执行成功；UI 工作单选择 `ccm-test-acceptance-verifier`、`ccm-acceptance-evidence` 和 `ccm-frontend-visual-qa`，并记录为原生引擎已应用。
- 14 个 Skill 均通过 `skill-creator/scripts/quick_validate.py`。
- `npm run check` 通过。
- `npm run test:runtime-tools`、全局 Agent loop self-test 和群聊 Coordinator protocol self-test 通过。
- `npm run build` 完成前端、飞书 MCP 与后端全量构建。
- 生产服务已在 `http://127.0.0.1:3082` 重启；首页返回 200，`/api/skills` 返回 14 个已启用 `ccm-*` Skill，托管包、元数据和启动日志均一致。

## 维护约束

- 新方法优先放入职责明确的 Skill；权限、状态、授权、输出 Schema 和硬门禁保留在系统代码。
- 新 Skill 必须补触发样例、普通问话反例、运行时同步和实际应用记录测试。
- 不以“同步成功”代替“已使用”；第三方 Agent 必须收到使用指令并回报，原生 Agent 必须记录应用引擎和所选 Skill。
