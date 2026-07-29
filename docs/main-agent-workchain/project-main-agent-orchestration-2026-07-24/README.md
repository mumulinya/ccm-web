# 项目主 Agent 与 TestAgent 编排

## 当前业务流程

项目管理会话由项目主 Agent 对用户负责，不再把用户消息直接当作第三方开发 Agent 的最终工作单：

```text
用户
-> 项目主 Agent（精确项目会话）
-> 当前项目唯一开发 Agent
-> TestAgent 独立验收
-> 项目主 Agent 最终验收与总结
```

群聊主 Agent 可以协调多个项目成员；项目主 Agent 只能读取和修改当前项目，不能创建虚假群聊、选择兄弟项目或读取群聊上下文。普通问答由项目主 Agent直接回复；只读项目分析可以由模型选择当前项目已授权的只读 MCP。开发任务由模型生成工作项、依赖和验收标准。

## 状态与数据

正式任务继续保存在统一任务库，使用：

- `assign_type=project`
- `orchestration_scope=project_session`
- `project_session_id`
- `project_main_run_id`
- `acceptance_state`

同一项目会话的开发工作项共享项目第三方 Agent 的 native session；同一工作目录中的修改工作项串行执行。旧 `pchat_*` 记录保持可读，新任务用正式任务 ID 作为任务卡与回放身份。兄弟项目会话不会因为相同目标被任务去重合并。

用户与项目主 Agent的正式消息进入项目会话。开发 Agent原始输出、TestAgent报告和返工过程进入任务时间线、Runner 产物与任务回放。只有最终验收通过的交付才进入项目长期记忆准入；失败、返工中和未验收输出不会成为正式长期记忆。

## 计划消息与断线恢复

- 正式项目任务使用稳定会话消息ID `project-main-task:<task_id>`，服务端按任务ID upsert，不重复创建助手气泡。
- 计划、工作项、验收、返工和终态变化更新同一条消息并发布精确 `project.session_messages_changed` 事件；心跳只刷新运行状态。
- 前端只保存用户消息和普通问答。任务助手消息由服务端持久化，SSE中的临时消息收到稳定 `message_id` 后立即切换身份。
- 页面加载和断线恢复通过 `/api/projects/main-agent/task` 重新水合未终态任务，且必须同时匹配项目、项目会话和任务；兄弟会话事件不会触发刷新。
- Web与飞书读取相同任务投影，来源回传仍保持隔离。

## 同任务计划修订

`POST /api/projects/main-agent/task-action` 支持 `action=revise_plan`、`feedback` 和 `client_message_id`。只有等待确认且尚未开始执行的计划可直接修订。项目主 Agent重新读取当前源码并调用模型；采用copy-on-success，成功后才替换计划和工作项，失败保留旧计划。重复 `client_message_id` 返回原修订且不重复调用模型。修订始终保留原任务ID、项目会话、父运行ID和队列身份，历史以 `ProjectMainPlanRevisionV1` 进入任务回放。

项目计划模式同时保存标题、生成时间、影响范围、源码依据、验收标准、全部步骤和兼容修订字段。任务详情通过现有任务回放接口惰性读取完整计划，长计划不在后端截断。

## 验收与失败策略

- 开发 Agent退出成功只表示工作项已提交，不能把主任务标记为完成。
- 产生文件变更、要求验证或要求独立复核时必须调用正式 TestAgent CLI。
- TestAgent读取用户目标、验收标准、真实变更、验证命令和项目独立测试目标，不读取其他项目或群聊。
- 验收失败后由项目主 Agent把真实缺口交回同一开发 Agent native session；最多返工并复验三轮。
- TestAgent证据校验不通过、源码在复核期间变化或三轮仍失败时，任务进入 `blocked`。
- TestAgent通过后仍由项目主 Agent生成最终复盘；最终总结模型失败时 fail closed。

## 项目测试目标

项目页的“测试目标”独立保存在项目元数据中，支持 Web、H5、API、混合应用、原生应用和其他入口。目标可以配置环境、URL、启动命令、验证命令、认证方式和“每次验收必测”。凭据值只进入 CCM 加密凭据仓库，浏览器接口仅返回 `hasValue`；TestAgent运行时才解密到受控环境变量。

接口：

- `GET/POST /api/projects/test-targets`
- `POST /api/projects/test-targets/delete`
- `GET /api/projects/main-agent/task`
- `POST /api/projects/main-agent/plan-confirm`
- `POST /api/projects/main-agent/task-action`

项目任务 SSE 继续兼容旧事件，并增加 `planning`、`work_item`、`testing`、`reworking`、`accepting` 和 `blocked`。统一 Runtime SSE 同时发布不含正文和命令的项目主 Agent状态事件。

## 验证证据

- `npm run check`
- `npm run build:frontend`
- `npm run build:backend`
- `node scripts/project-main-agent-orchestration-selftest.mjs`：34 项通过，包含精确恢复、服务端权威消息、同任务修订和飞书共用投影
- `node scripts/project-plan-production-closure-selftest.mjs`：真实隔离任务验证同任务修订、幂等和失败保留旧计划
- `node scripts/task-plan-production-render-regression.mjs`：桌面长计划、移动端自验和全局职责标题通过
- `npm run test:tasks -- --no-build`：任务域 15 个测试入口全部通过，包含 TestAgent生产加固和项目计划生产化回归
- `npm run test:frontend -- --no-build`：前端域 23 个测试入口全部通过
- 项目页已在桌面端与 `390x844` 移动端实测，测试目标弹窗无横向溢出
- 所有专项测试使用静态契约或 mock Provider，付费模型调用为 `0`
