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
- `node scripts/project-main-agent-orchestration-selftest.mjs`：12 项通过，包含正式任务源码检查点回滚和阶段事件刷新隔离
- `npm run test:tasks -- --no-build`：任务域 6 个测试文件全部通过，包含 TestAgent 生产加固检查
- `npm run test:quick -- --no-build`：快速回归 14/14 通过
- 项目页已在桌面端与 `390x844` 移动端实测，测试目标弹窗无横向溢出
- 所有专项测试使用静态契约或 mock Provider，付费模型调用为 `0`
